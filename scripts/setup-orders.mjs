// Crea la tabla `orders` (pedidos de pastelería) directamente por SQL.
// Se hace por SQL en vez de `drizzle-kit push` porque la introspección de
// drizzle-kit falla contra esta base de datos. Las columnas coinciden con
// lib/db/schema.ts. Idempotente.
// Uso: npx dotenv -e .env.local -- node scripts/setup-orders.mjs
import postgres from "postgres";

const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim();
if (!url) {
  console.error("Falta DATABASE_URL o POSTGRES_URL");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id serial PRIMARY KEY,
      customer_id integer REFERENCES customers(id),
      customer_name text NOT NULL,
      phone text NOT NULL,
      product text NOT NULL,
      due_date text NOT NULL,
      delivery_type text NOT NULL,
      notes text,
      status text DEFAULT 'pending' NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `;
  console.log("✅ Tabla orders lista.");
} catch (err) {
  console.error("Error:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
