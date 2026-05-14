import { supabase } from "@/lib/supabase";
import type { AnatomyNameRecord } from "@/data/anatomyDisplayNames";
import type { TissueType } from "@/components/skeleton/SkeletonScene";

const ANATOMY_NAME_COLUMNS =
  "slug, name_ro, common_name_ro, scientific_name_ro, display_name_ro, subtitle_name, english_name, name_latin, latin_name, aliases_ro, missing_ro_display_name, model_selection_id, tissue";

export type AnatomyStructureNameRow = AnatomyNameRecord & {
  aliases_ro?: string[] | null;
  model_selection_id?: string | null;
  tissue?: TissueType | null;
};

function normalize(value: string | null | undefined) {
  return value
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean))) as string[];
}

export function anatomyLookupKeys(input: {
  id?: string | null;
  label?: string | null;
  labelEn?: string | null;
  regionId?: string | null;
}) {
  const normalizedLabel = normalize(input.labelEn ?? input.label);
  return unique([
    input.id,
    input.regionId,
    normalizedLabel,
    normalizedLabel ? `os-${normalizedLabel}` : null,
    normalizedLabel ? `muschi-${normalizedLabel}` : null,
    normalizedLabel ? `tendon-${normalizedLabel}` : null,
  ]);
}

export async function fetchAnatomyStructureName(input: {
  id?: string | null;
  label?: string | null;
  labelEn?: string | null;
  regionId?: string | null;
  tissue?: TissueType | null;
}): Promise<AnatomyStructureNameRow | null> {
  const keys = anatomyLookupKeys(input);
  const englishName = input.labelEn?.trim() ?? input.label?.trim();

  if (!keys.length && !englishName) return null;

  const byKey =
    keys.length > 0
      ? await supabase
          .from("anatomy_structures")
          .select(ANATOMY_NAME_COLUMNS)
          .or(`slug.in.(${keys.join(",")}),model_selection_id.in.(${keys.join(",")})`)
          .limit(10)
      : { data: null, error: null };

  if (!byKey.error && byKey.data?.length) {
    const rows = byKey.data as AnatomyStructureNameRow[];
    return (
      rows.find((row) => row.tissue === input.tissue && row.model_selection_id === input.id) ??
      rows.find((row) => row.tissue === input.tissue) ??
      rows[0] ??
      null
    );
  }

  if (!englishName) return null;

  const { data, error } = await supabase
    .from("anatomy_structures")
    .select(ANATOMY_NAME_COLUMNS)
    .ilike("english_name", `%${englishName}%`)
    .limit(10);

  if (error || !data?.length) return null;
  const rows = data as AnatomyStructureNameRow[];
  return rows.find((row) => row.tissue === input.tissue) ?? rows[0] ?? null;
}

export async function listMissingRomanianDisplayNames() {
  const { data, error } = await supabase.rpc("list_missing_romanian_display_names");
  if (error) throw error;
  return data ?? [];
}
