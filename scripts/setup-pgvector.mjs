// Habilita pgvector y crea la tabla `products` (con índice HNSW) directamente por
// SQL. Se hace por SQL en vez de `drizzle-kit push` porque la introspección de
// drizzle-kit falla contra esta base de datos. Las columnas coinciden exactamente
// con lib/db/schema.ts, así que las consultas tipadas de Drizzle siguen funcionando.
// Idempotente. Uso: npx dotenv -e .env.local -- node scripts/setup-pgvector.mjs
import postgres from "postgres";

const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim();
if (!url) {
  console.error("Falta DATABASE_URL o POSTGRES_URL");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

try {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("✅ Extensión pgvector habilitada.");

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id serial PRIMARY KEY,
      categoria_seccion text NOT NULL,
      categoria text NOT NULL,
      subcategoria text,
      producto text NOT NULL,
      descripcion text,
      precio numeric(6, 2),
      embedding vector(1536),
      created_at timestamp DEFAULT now() NOT NULL
    )
  `;
  console.log("✅ Tabla products lista.");

  await sql`
    CREATE INDEX IF NOT EXISTS products_embedding_idx
    ON products USING hnsw (embedding vector_cosine_ops)
  `;
  console.log("✅ Índice HNSW listo.");
} catch (err) {
  console.error("Error:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
