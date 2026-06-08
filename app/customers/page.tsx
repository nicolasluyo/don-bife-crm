import CustomersClient from "@/components/CustomersClient";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Clientes</h1>
        <p className="text-stone-500 text-sm mt-1">
          Clientes que han contactado a Don Bife por WhatsApp
        </p>
      </div>
      <CustomersClient />
    </div>
  );
}
