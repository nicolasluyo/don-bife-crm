const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensiones

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY no está configurado");
  return key;
}

async function requestEmbeddings(input: string | string[]): Promise<number[][]> {
  const res = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings error ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

/** Genera el embedding de un solo texto (ej: la consulta del cliente). */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await requestEmbeddings(text);
  return embedding;
}

/** Genera embeddings de varios textos en una sola llamada (ej: sembrar la carta). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return requestEmbeddings(texts);
}
