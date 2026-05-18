import { createQueryEmbedding } from "./embeddings";

export type KnowledgeEntry = {
  id: string;
  tissue?: string | null;
  structure_slug?: string | null;
  model_selection_id?: string | null;
  body_region?: string | null;
  category: string;
  title_ro: string;
  content_ro: string;
  priority: number;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  similarity?: number | null;
  retrieval_source?: "semantic" | "keyword" | "selection" | "virtual";
};

export type RetrievalFilters = {
  aiLayer?: "skeleton" | "muscular" | null;
  tissue?: "os" | "muschi" | "tendon" | "organ" | "nerv" | "articulatie" | null;
  bodyRegion?: string | null;
  structureSlug?: string | null;
  categories?: string[] | null;
  tags?: string[] | null;
  limit?: number;
  matchThreshold?: number;
};

type SupabaseLike = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>;
  from: (table: string) => {
    select: (columns: string) => QueryBuilderLike;
  };
};

type QueryBuilderLike = PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }> & {
  eq: (column: string, value: unknown) => QueryBuilderLike;
  in: (column: string, values: unknown[]) => QueryBuilderLike;
  or: (filters: string) => QueryBuilderLike;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilderLike;
  limit: (count: number) => QueryBuilderLike;
};

function normalizeText(value: string | undefined | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildKnowledgeEmbeddingText(entry: Pick<KnowledgeEntry, "title_ro" | "content_ro" | "category" | "body_region" | "structure_slug" | "tags" | "metadata">) {
  const metadataText = entry.metadata
    ? Object.entries(entry.metadata)
        .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
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

function queryTerms(query: string, filters: RetrievalFilters) {
  return unique([
    ...normalizeToken(query).split(/\s+/g).filter((term) => term.length >= 3),
    ...(filters.bodyRegion ? normalizeToken(filters.bodyRegion).split(/\s+/g) : []),
    ...(filters.structureSlug ? normalizeToken(filters.structureSlug).split(/\s+/g) : []),
    ...(filters.tags ?? []).flatMap((tag) => normalizeToken(tag).split(/\s+/g)),
  ]);
}

function scoreKeywordEntry(entry: KnowledgeEntry, query: string, filters: RetrievalFilters) {
  const searchable = normalizeText([
    entry.title_ro,
    entry.content_ro,
    entry.category,
    entry.body_region,
    entry.structure_slug,
    entry.model_selection_id,
    entry.tags?.join(" "),
  ].filter(Boolean).join(" "));
  let score = entry.priority ?? 1;

  if (filters.structureSlug && entry.structure_slug === filters.structureSlug) score += 16;
  if (filters.bodyRegion && entry.body_region === filters.bodyRegion) score += 10;
  if (filters.categories?.includes(entry.category)) score += 4;
  if (filters.tags?.some((tag) => entry.tags?.includes(tag))) score += 5;
  if (filters.tissue && entry.tissue === filters.tissue) score += 6;
  if (filters.aiLayer === "skeleton" && entry.tissue === "os") score += 3;
  if (filters.aiLayer === "muscular" && entry.tissue === "muschi") score += 3;

  for (const term of queryTerms(query, filters)) {
    if (searchable.includes(term)) score += 2;
  }

  return score;
}

async function safeRows<T>(query: PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

export async function semanticSearchKnowledge(
  supabase: SupabaseLike,
  query: string,
  filters: RetrievalFilters = {},
  embedder: (text: string) => Promise<number[] | null> = createQueryEmbedding,
) {
  const embedding = await embedder(query);
  if (!embedding) return [];

  const rows = await safeRows<KnowledgeEntry>(
    supabase.rpc("match_ai_knowledge_entries", {
      p_query_embedding: embedding,
      p_ai_layer: filters.aiLayer ?? null,
      p_body_region: filters.bodyRegion ?? null,
      p_structure_slug: filters.structureSlug ?? null,
      p_categories: filters.categories ?? null,
      p_tags: filters.tags ?? null,
      p_match_threshold: filters.matchThreshold ?? 0.68,
      p_match_count: filters.limit ?? 8,
    }),
  );

  return rows.map((entry) => ({ ...entry, retrieval_source: "semantic" as const }));
}

export async function keywordSearchKnowledge(
  supabase: SupabaseLike,
  query: string,
  filters: RetrievalFilters = {},
) {
  let builder = supabase
    .from("ai_knowledge_entries")
    .select("id, tissue, structure_slug, model_selection_id, body_region, category, title_ro, content_ro, priority, tags, metadata")
    .eq("active", true);

  if (filters.tissue) {
    builder = builder.eq("tissue", filters.tissue);
  } else {
    if (filters.aiLayer === "skeleton") builder = builder.eq("tissue", "os");
    if (filters.aiLayer === "muscular") builder = builder.eq("tissue", "muschi");
  }
  if (filters.categories?.length) builder = builder.in("category", filters.categories);

  const rows = await safeRows<KnowledgeEntry>(
    builder
      .order("priority", { ascending: false })
      .limit(160),
  );

  return rows
    .map((entry) => ({
      ...entry,
      retrieval_source: "keyword" as const,
      similarity: scoreKeywordEntry(entry, query, filters),
    }))
    .filter((entry) => (entry.similarity ?? 0) > (entry.priority ?? 1))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, filters.limit ?? 12);
}

export async function hybridSearchKnowledge(
  supabase: SupabaseLike,
  query: string,
  filters: RetrievalFilters = {},
) {
  const [semanticRows, keywordRows] = await Promise.all([
    semanticSearchKnowledge(supabase, query, filters).catch(() => []),
    keywordSearchKnowledge(supabase, query, { ...filters, limit: Math.max(filters.limit ?? 12, 16) }),
  ]);

  const seen = new Set<string>();
  const merged = [...semanticRows, ...keywordRows]
    .sort((a, b) => {
      const aSemanticBoost = a.retrieval_source === "semantic" ? 100 : 0;
      const bSemanticBoost = b.retrieval_source === "semantic" ? 100 : 0;
      return (bSemanticBoost + (b.similarity ?? b.priority ?? 0)) - (aSemanticBoost + (a.similarity ?? a.priority ?? 0));
    })
    .filter((entry) => {
      const key = entry.id || `${entry.title_ro}:${entry.content_ro}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, filters.limit ?? 12);

  if (process.env.NODE_ENV !== "production" && process.env.SANTIX_DEBUG_RETRIEVAL === "true") {
    console.info("[Santix RAG]", {
      normalized_query: normalizeText(query),
      filters,
      semantic_count: semanticRows.length,
      results: merged.map((entry) => ({
        title: entry.title_ro,
        similarity: entry.similarity,
        source: entry.retrieval_source,
      })),
    });
  }

  return merged;
}
