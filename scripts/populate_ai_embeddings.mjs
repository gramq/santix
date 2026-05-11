import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const provider = process.env.EMBEDDING_PROVIDER ?? "openai";
const openAiKey = process.env.OPENAI_EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const batchSize = Number(process.env.EMBEDDING_BATCH_SIZE ?? "20");
const force = process.argv.includes("--all");

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (provider !== "openai") {
  console.error(`Unsupported EMBEDDING_PROVIDER="${provider}". Current Santix embedding schema uses OpenAI-compatible 1536 dimensions.`);
  process.exit(1);
}

if (!openAiKey) {
  console.error("Missing OPENAI_EMBEDDING_API_KEY or OPENAI_API_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function buildEmbeddingText(entry) {
  const metadataText = entry.metadata
    ? Object.entries(entry.metadata)
        .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join("; ")
    : "";

  return [
    entry.title_ro,
    `Categorie: ${entry.category}`,
    entry.structure_slug ? `Structură: ${entry.structure_slug}` : "",
    entry.body_region ? `Regiune: ${entry.body_region}` : "",
    entry.tags?.length ? `Tag-uri: ${entry.tags.join(", ")}` : "",
    metadataText,
    entry.content_ro,
  ].filter(Boolean).join("\n");
}

async function createEmbedding(input) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  const embedding = json.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) throw new Error("Embedding response did not include an embedding array.");
  if (embedding.length !== 1536) {
    throw new Error(`Embedding dimension mismatch: expected 1536, received ${embedding.length}.`);
  }
  return embedding;
}

async function fetchEntries(offset) {
  let query = supabase
    .from("ai_knowledge_entries")
    .select("id, title_ro, content_ro, category, structure_slug, body_region, tags, metadata, embedding_model")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .range(offset, offset + batchSize - 1);

  if (!force) query = query.is("embedding", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

let offset = 0;
let updated = 0;

console.info(`[Santix embeddings] provider=${provider}, model=${model}, mode=${force ? "all" : "missing-only"}`);

while (true) {
  const entries = await fetchEntries(offset);
  if (!entries.length) break;

  for (const entry of entries) {
    const text = buildEmbeddingText(entry);
    console.info(`[Santix embeddings] ${entry.id} ${entry.title_ro}`);
    const embedding = await createEmbedding(text);
    const { error } = await supabase
      .from("ai_knowledge_entries")
      .update({
        embedding,
        embedding_model: model,
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    if (error) throw new Error(error.message);
    updated += 1;
  }

  if (entries.length < batchSize) break;
  if (force) offset += batchSize;
}

console.info(`[Santix embeddings] done. Updated ${updated} entries.`);
