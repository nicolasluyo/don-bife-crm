import Anthropic from "@anthropic-ai/sdk";
import { db, reservations, agentLogs, products, orders } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { AGENT_SYSTEM_PROMPT, RESTAURANT_INFO } from "./constants";
import { sendReservationEmail, sendCancellationEmail, sendOrderEmail } from "./notifications";
import { embedText } from "./embeddings";

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY no está configurado");
  return new Anthropic({ apiKey: key });
}

const tools: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description: "Verifica si hay disponibilidad para una fecha, hora y número de personas específicos.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Fecha en formato DD/MM/YYYY" },
        time: { type: "string", description: "Hora en formato HH:MM (ej: 19:00)" },
        guests: { type: "number", description: "Número de personas" },
      },
      required: ["date", "time", "guests"],
    },
  },
  {
    name: "create_reservation",
    description: "Crea una reserva confirmada para el cliente.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerName: { type: "string", description: "Nombre completo del cliente" },
        phone: { type: "string", description: "Teléfono o WhatsApp" },
        date: { type: "string", description: "Fecha en formato DD/MM/YYYY" },
        time: { type: "string", description: "Hora en formato HH:MM" },
        guests: { type: "number", description: "Número de personas" },
        occasion: { type: "string", description: "Ocasión o motivo (opcional)" },
        notes: { type: "string", description: "Notas adicionales, ej: preferencia de sede (opcional)" },
      },
      required: ["customerName", "phone", "date", "time", "guests"],
    },
  },
  {
    name: "get_reservation",
    description: "Busca la reserva activa del cliente actual.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerId: { type: "number", description: "ID del cliente en el sistema" },
      },
      required: ["customerId"],
    },
  },
  {
    name: "modify_reservation",
    description: "Modifica una reserva existente (fecha, hora o número de personas).",
    input_schema: {
      type: "object" as const,
      properties: {
        reservationId: { type: "number", description: "ID de la reserva" },
        date: { type: "string", description: "Nueva fecha (opcional)" },
        time: { type: "string", description: "Nueva hora (opcional)" },
        guests: { type: "number", description: "Nuevo número de personas (opcional)" },
        notes: { type: "string", description: "Notas actualizadas (opcional)" },
      },
      required: ["reservationId"],
    },
  },
  {
    name: "cancel_reservation",
    description: "Cancela una reserva existente.",
    input_schema: {
      type: "object" as const,
      properties: {
        reservationId: { type: "number", description: "ID de la reserva a cancelar" },
      },
      required: ["reservationId"],
    },
  },
  {
    name: "search_menu",
    description:
      "Busca platos, bebidas y postres en la carta real de Los Postres de Patty por similitud semántica. ÚSALA SIEMPRE que el cliente pregunte por cualquier comida, bebida, postre, precio, ingrediente o disponibilidad del menú (ej: '¿qué tortas tienen?', 'algo frío con café', '¿cuánto cuesta el cheesecake?'). Devuelve los productos más parecidos con su precio. No inventes productos ni precios: usa solo lo que devuelve esta herramienta.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Lo que busca el cliente, en sus propias palabras (ej: 'tortas de chocolate', 'café frío', 'algo para compartir').",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_order",
    description:
      "Registra un PEDIDO de pastelería (torta, postre, etc.) para encargar/llevar. Úsala solo cuando el cliente confirme que quiere encargar un producto, NO para reservar una mesa (para eso está create_reservation). Antes de llamarla confirma con el cliente los 5 datos requeridos. Recuerda que las tortas necesitan al menos 24-48 h de anticipación.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerName: { type: "string", description: "Nombre del cliente" },
        phone: { type: "string", description: "Teléfono o WhatsApp del cliente" },
        product: { type: "string", description: "Producto que desea pedir (ej: 'Torta Red Velvet corazón')" },
        dueDate: { type: "string", description: "Fecha en que lo necesita, formato DD/MM/YYYY" },
        deliveryType: { type: "string", enum: ["recojo", "delivery"], description: "Tipo de entrega: recojo en tienda o delivery" },
        notes: { type: "string", description: "Detalles adicionales del pedido (sabor, tamaño, dedicatoria, etc.) (opcional)" },
      },
      required: ["customerName", "phone", "product", "dueDate", "deliveryType"],
    },
  },
];

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: { customerId: number; conversationId: number }
): Promise<string> {
  const logInput = JSON.stringify(toolInput);
  let result = "";

  try {
    if (toolName === "check_availability") {
      const { date, time, guests } = toolInput as { date: string; time: string; guests: number };
      const existing = await db
        .select({ totalGuests: sql<number>`sum(${reservations.guests})` })
        .from(reservations)
        .where(
          and(
            eq(reservations.date, date),
            eq(reservations.time, time),
            eq(reservations.status, "confirmed")
          )
        );

      const occupied = Number(existing[0]?.totalGuests ?? 0);
      const available = RESTAURANT_INFO.capacity.maxPerSlot - occupied;

      if (available >= guests) {
        result = `Hay disponibilidad para ${guests} personas el ${date} a las ${time}. Quedan ${available} cupos en ese horario.`;
      } else {
        result = `No hay disponibilidad para ${guests} personas el ${date} a las ${time}. Solo quedan ${available} cupos. Sugiera otro horario.`;
      }
    }

    else if (toolName === "create_reservation") {
      const input = toolInput as {
        customerName: string;
        phone: string;
        date: string;
        time: string;
        guests: number;
        occasion?: string;
        notes?: string;
      };

      const [reservation] = await db
        .insert(reservations)
        .values({
          customerId: context.customerId,
          customerName: input.customerName,
          phone: input.phone,
          date: input.date,
          time: input.time,
          guests: input.guests,
          occasion: input.occasion,
          notes: input.notes,
          status: "confirmed",
        })
        .returning();

      await sendReservationEmail(reservation).catch(console.error);

      result = `Reserva creada exitosamente. ID: ${reservation.id}. ${input.customerName} — ${input.guests} personas — ${input.date} a las ${input.time}.`;
    }

    else if (toolName === "get_reservation") {
      const { customerId } = toolInput as { customerId: number };
      const [reservation] = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.customerId, customerId),
            eq(reservations.status, "confirmed")
          )
        )
        .orderBy(reservations.createdAt)
        .limit(1);

      result = reservation
        ? `Reserva encontrada — ID: ${reservation.id}, ${reservation.customerName}, ${reservation.guests} personas, ${reservation.date} a las ${reservation.time}.`
        : "No se encontró ninguna reserva activa para este cliente.";
    }

    else if (toolName === "modify_reservation") {
      const { reservationId, ...updates } = toolInput as {
        reservationId: number;
        date?: string;
        time?: string;
        guests?: number;
        notes?: string;
      };

      await db
        .update(reservations)
        .set({ ...updates, status: "modified", updatedAt: new Date() })
        .where(eq(reservations.id, reservationId));

      result = `Reserva ${reservationId} modificada exitosamente.`;
    }

    else if (toolName === "cancel_reservation") {
      const { reservationId } = toolInput as { reservationId: number };
      const [reservation] = await db
        .update(reservations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(reservations.id, reservationId))
        .returning();

      if (reservation) {
        await sendCancellationEmail(reservation).catch(console.error);
      }

      result = `Reserva ${reservationId} cancelada correctamente.`;
    }

    else if (toolName === "search_menu") {
      const { query } = toolInput as { query: string };
      const embedding = await embedText(query);
      const vectorLiteral = JSON.stringify(embedding);

      const matches = await db
        .select({
          producto: products.producto,
          categoria: products.categoria,
          subcategoria: products.subcategoria,
          descripcion: products.descripcion,
          precio: products.precio,
        })
        .from(products)
        .orderBy(sql`${products.embedding} <=> ${vectorLiteral}::vector`)
        .limit(5);

      result = matches.length
        ? matches
            .map((m) => {
              const cat = m.subcategoria ? `${m.categoria} / ${m.subcategoria}` : m.categoria;
              const precio = m.precio != null ? ` — S/ ${m.precio}` : "";
              const desc = m.descripcion ? ` · ${m.descripcion}` : "";
              return `${m.producto} (${cat})${precio}${desc}`;
            })
            .join("\n")
        : "No encontré productos en la carta que coincidan con esa búsqueda.";
    }

    else if (toolName === "create_order") {
      const input = toolInput as {
        customerName: string;
        phone: string;
        product: string;
        dueDate: string;
        deliveryType: string;
        notes?: string;
      };

      const [order] = await db
        .insert(orders)
        .values({
          customerId: context.customerId,
          customerName: input.customerName,
          phone: input.phone,
          product: input.product,
          dueDate: input.dueDate,
          deliveryType: input.deliveryType === "delivery" ? "delivery" : "recojo",
          notes: input.notes,
          status: "pending",
        })
        .returning();

      await sendOrderEmail(order).catch(console.error);

      const entrega = order.deliveryType === "delivery" ? "delivery" : "recojo en tienda";
      result = `Pedido registrado. ID: ${order.id}. ${input.customerName} — ${input.product} — para el ${input.dueDate} (${entrega}).`;
    }

    else {
      result = "Herramienta no reconocida.";
    }
  } catch (err) {
    result = `Error al ejecutar ${toolName}: ${String(err)}`;
  }

  await db.insert(agentLogs).values({
    conversationId: context.conversationId,
    toolCalled: toolName,
    toolInput: logInput,
    toolOutput: result,
  }).catch(() => {});

  return result;
}

export async function runAgent(params: {
  conversationId: number;
  customerId: number;
  messageHistory: Array<{ role: "user" | "assistant"; content: string }>;
  newMessage: string;
}): Promise<string> {
  const { conversationId, customerId, messageHistory, newMessage } = params;

  const messages: Anthropic.MessageParam[] = [
    ...messageHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: newMessage },
  ];

  const anthropic = getAnthropic();

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: AGENT_SYSTEM_PROMPT,
    tools,
    messages,
  });

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResults: Anthropic.MessageParam = {
      role: "user",
      content: await Promise.all(
        toolUseBlocks.map(async (block) => {
          if (block.type !== "tool_use") return null!;
          const output = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            { customerId, conversationId }
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: output,
          };
        })
      ),
    };

    messages.push({ role: "assistant", content: response.content });
    messages.push(toolResults);

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: AGENT_SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text"
    ? textBlock.text
    : "Disculpe, no pude procesar su mensaje. Intente nuevamente.";
}
