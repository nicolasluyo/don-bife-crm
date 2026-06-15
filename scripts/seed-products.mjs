// Carga los productos de scripts/menu.csv a la tabla `products`, generando el
// embedding (OpenAI text-embedding-3-small, 1536 dims) de nombre + categoría +
// descripción para cada uno.
// Requisitos: extensión pgvector + tabla products creada (db:push), y OPENAI_API_KEY.
// Uso: npx dotenv -e .env.local -- node scripts/seed-products.mjs
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim();
const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim();
if (!dbUrl) {
  console.error("Falta DATABASE_URL o POSTGRES_URL");
  process.exit(1);
}
if (!openaiKey) {
  console.error("Falta OPENAI_API_KEY (agrégala a .env.local)");
  process.exit(1);
}

// --- Parseo de una línea CSV con soporte de campos entre comillas ---
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

const csv = readFileSync(join(__dirname, "menu.csv"), "utf8").replace(/\r\n/g, "\n");
const lines = csv.split("\n").filter((l) => l.trim().length > 0);
lines.shift(); // header

const rows = lines.map((line) => {
  const [, categoriaSeccion, categoria, subcategoria, producto, descripcion, precio] =
    parseCsvLine(line);
  return {
    categoriaSeccion: categoriaSeccion.trim(),
    categoria: categoria.trim(),
    subcategoria: subcategoria.trim() || null,
    producto: producto.trim(),
    descripcion: descripcion.trim() || null,
    precio: precio.trim() ? precio.trim() : null,
  };
});

console.log(`Productos en el CSV: ${rows.length}`);

// Texto a embeber: nombre + categoría (contexto) + descripción.
function embedTextFor(r) {
  const cat = r.subcategoria ? `${r.categoria}, ${r.subcategoria}` : r.categoria;
  return [`${r.producto} (${cat})`, r.descripcion].filter(Boolean).join(". ");
}

async function getEmbeddings(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

const sql = postgres(dbUrl, { ssl: "require" });

try {
  console.log("Generando embeddings en OpenAI…");
  const embeddings = await getEmbeddings(rows.map(embedTextFor));

  await sql`DELETE FROM products`;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const vec = JSON.stringify(embeddings[i]);
    await sql`
      INSERT INTO products
        (categoria_seccion, categoria, subcategoria, producto, descripcion, precio, embedding)
      VALUES
        (${r.categoriaSeccion}, ${r.categoria}, ${r.subcategoria}, ${r.producto},
         ${r.descripcion}, ${r.precio}, ${vec}::vector)
    `;
  }

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM products`;
  console.log(`✅ ${count} productos cargados con embedding.`);
} catch (err) {
  console.error("Error:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
