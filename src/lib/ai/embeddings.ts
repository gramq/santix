export async function createQueryEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

  if (!apiKey || process.env.SANTIX_ENABLE_SEMANTIC_SEARCH !== "true") {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding error ${response.status}: ${errorText}`);
  }

  const json = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  return json.data?.[0]?.embedding ?? null;
}
