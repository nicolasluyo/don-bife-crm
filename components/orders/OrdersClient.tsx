"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  CalendarDays,
  Phone,
  Truck,
  Store,
  StickyNote,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: number;
  customerName: string;
  phone: string;
  product: string;
  dueDate: string;
  deliveryType: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

const statusStyles: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmado", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pendiente", cls: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
};

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetch_ = async () => {
    setLoading(true);
    const url =
      statusFilter === "all"
        ? "/api/orders"
        : `/api/orders?status=${statusFilter}`;
    const res = await fetch(url);
    setOrders(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, [statusFilter]);

  async function updateStatus(id: number, status: string) {
    if (status === "cancelled" && !confirm("¿Cancelar este pedido?")) return;
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetch_();
  }

  const filters = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendientes" },
    { value: "confirmed", label: "Confirmados" },
    { value: "cancelled", label: "Cancelados" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              statusFilter === f.value
                ? "bg-red-800 text-white"
                : "text-stone-600 hover:bg-stone-100 bg-white border border-stone-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-stone-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Sin pedidos</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Entrega</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-stone-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((o) => {
                const s = statusStyles[o.status] ?? statusStyles.pending;
                const isDelivery = o.deliveryType === "delivery";
                return (
                  <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">{o.customerName}</p>
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {o.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-800">{o.product}</p>
                      {o.notes && (
                        <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                          <StickyNote className="w-3 h-3" /> {o.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-stone-700">
                        <CalendarDays className="w-3.5 h-3.5 text-stone-400" />
                        {o.dueDate}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-stone-700">
                        {isDelivery ? (
                          <Truck className="w-3.5 h-3.5 text-stone-400" />
                        ) : (
                          <Store className="w-3.5 h-3.5 text-stone-400" />
                        )}
                        {isDelivery ? "Delivery" : "Recojo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", s.cls)}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {o.status === "pending" && (
                          <button
                            onClick={() => updateStatus(o.id, "confirmed")}
                            className="text-emerald-600 hover:text-emerald-800 p-1 rounded"
                            title="Confirmar"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {o.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatus(o.id, "cancelled")}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
