import { Resend } from "resend";
import type { Reservation, Order } from "./db/schema";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder");
}

export async function sendOrderEmail(order: Order & { customerUsername?: string }) {
  const restaurantEmail = process.env.RESTAURANT_EMAIL;
  if (!restaurantEmail || !process.env.RESEND_API_KEY) return;

  const entrega = order.deliveryType === "delivery" ? "Delivery" : "Recojo en tienda";
  const subject = `🍰 Nuevo pedido: ${order.customerName} — ${order.product} (${order.dueDate})`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #7f1d1d; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #ffffff; margin: 0;">🍰 Nuevo Pedido — Los Postres de Patty</h2>
        <p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 14px;">Pastelería y cafetería — Real Plaza Piura</p>
      </div>
      <div style="background: #fff; border: 1px solid #fee2e2; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Cliente</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${order.customerName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Teléfono</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${order.phone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Producto</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${order.product}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Fecha que lo necesita</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${order.dueDate}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Entrega</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${entrega}</td></tr>
          <tr><td style="padding: 8px;"><strong>Notas</strong></td><td style="padding: 8px;">${order.notes || "—"}</td></tr>
        </table>
        ${order.customerUsername ? `<p style="color: #6b7280; font-size: 14px; margin-top: 16px;">WhatsApp: ${order.customerUsername}</p>` : ""}
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #f5f5f4; padding-top: 16px;">Enviado automáticamente por el Agente IA de Los Postres de Patty 🍰</p>
      </div>
    </div>
  `;

  await getResend().emails.send({
    from: "Los Postres de Patty IA <onboarding@resend.dev>",
    to: [restaurantEmail],
    subject,
    html,
  });
}

export async function sendReservationEmail(reservation: Reservation & { customerUsername?: string }) {
  const restaurantEmail = process.env.RESTAURANT_EMAIL;
  if (!restaurantEmail || !process.env.RESEND_API_KEY) return;

  const subject = `🔥 Nueva reserva: ${reservation.customerName} — ${reservation.date} ${reservation.time}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #7f1d1d; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #ffffff; margin: 0;">🍰 Nueva Reserva — Los Postres de Patty</h2>
        <p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 14px;">Pastelería y cafetería — Real Plaza Piura</p>
      </div>
      <div style="background: #fff; border: 1px solid #fee2e2; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Cliente</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${reservation.customerName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Teléfono</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${reservation.phone}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Fecha</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${reservation.date}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Hora</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${reservation.time}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Personas</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${reservation.guests}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;"><strong>Ocasión</strong></td><td style="padding: 8px; border-bottom: 1px solid #f5f5f4;">${reservation.occasion || "No especificada"}</td></tr>
          <tr><td style="padding: 8px;"><strong>Notas</strong></td><td style="padding: 8px;">${reservation.notes || "—"}</td></tr>
        </table>
        ${reservation.customerUsername ? `<p style="color: #6b7280; font-size: 14px; margin-top: 16px;">WhatsApp: ${reservation.customerUsername}</p>` : ""}
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #f5f5f4; padding-top: 16px;">Enviado automáticamente por el Agente IA de Los Postres de Patty 🍰</p>
      </div>
    </div>
  `;

  await getResend().emails.send({
    from: "Los Postres de Patty IA <onboarding@resend.dev>",
    to: [restaurantEmail],
    subject,
    html,
  });
}

export async function sendCancellationEmail(reservation: Reservation) {
  const restaurantEmail = process.env.RESTAURANT_EMAIL;
  if (!restaurantEmail || !process.env.RESEND_API_KEY) return;

  await getResend().emails.send({
    from: "Los Postres de Patty IA <onboarding@resend.dev>",
    to: [restaurantEmail],
    subject: `Cancelación: ${reservation.customerName} — ${reservation.date} ${reservation.time}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 12px;">
        <h2 style="color: #7f1d1d;">Reserva Cancelada — Los Postres de Patty</h2>
        <p>El cliente <strong>${reservation.customerName}</strong> canceló su reserva para el <strong>${reservation.date}</strong> a las <strong>${reservation.time}</strong> (${reservation.guests} personas).</p>
        <p style="color: #9ca3af; font-size: 12px;">Enviado automáticamente por el Agente IA de Los Postres de Patty 🍰</p>
      </div>
    `,
  });
}
