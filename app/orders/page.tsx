import OrdersClient from "@/components/orders/OrdersClient";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Pedidos</h1>
        <p className="text-stone-500 text-sm mt-1">
          Pedidos de pastelería registrados por el agente IA
        </p>
      </div>
      <OrdersClient />
    </div>
  );
}
