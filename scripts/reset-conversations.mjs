// Cierra las conversaciones activas para que los próximos mensajes arranquen
// una conversación nueva sin historial de la configuración anterior (Don Bife).
// Uso: npx dotenv -e .env.local -- node scripts/reset-conversations.mjs
import postgres from "postgres";

const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim();
if (!url) {
  console.error("Falta DATABASE_URL o POSTGRES_URL");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

try {
  const res = await sql`UPDATE conversations SET status = 'closed' WHERE status = 'active'`;
  console.log("Conversaciones cerradas:", res.count);
} catch (err) {
  console.error("Error:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
