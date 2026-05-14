import { supabase } from "@/lib/supabase";
import type { TissueType } from "@/components/skeleton/SkeletonScene";
import { getAnatomyDisplayName, type AnatomyNameRecord } from "@/data/anatomyDisplayNames";
import { fetchAnatomyStructureName } from "@/lib/anatomyStructures";

export const AI_HISTORY_REFRESH_EVENT = "santix-ai-history-refresh";
export const AI_CONVERSATION_OPEN_EVENT = "santix-open-ai-conversation";
export const AI_CONVERSATION_DELETED_EVENT = "santix-ai-conversation-deleted";

export interface AiConversationSummary {
  id: string;
  title: string;
  structure_slug: string | null;
  model_selection_id: string | null;
  tissue: TissueType | null;
  created_at: string;
  updated_at: string;
  last_message_preview?: string;
  message_count?: number;
  structure_display_name?: string;
  structure_subtitle?: string;
}

export interface AiConversationMessage {
  role: "assistant" | "user" | "system";
  content_ro: string;
  created_at: string;
}

export type OpenAiConversationDetail = AiConversationSummary;

type AiConversationRow = {
  id: string;
  title: string;
  structure_slug: string | null;
  model_selection_id: string | null;
  tissue: TissueType | null;
  created_at: string;
  updated_at: string;
};

type AiMessageRow = {
  role: "assistant" | "user" | "system";
  content_ro: string;
  created_at: string;
};

export async function fetchAiConversationSummaries(
  limit?: number,
): Promise<AiConversationSummary[]> {
  let query = supabase
    .from("ai_conversations")
    .select("id, title, structure_slug, model_selection_id, tissue, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) throw error;

  const conversations = (data ?? []) as AiConversationRow[];
  return Promise.all(
    conversations.map(async (conversation) => {
      const [{ count }, { data: latestMessages }] = await Promise.all([
        supabase
          .from("ai_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation.id),
        supabase
          .from("ai_messages")
          .select("content_ro, role, created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const latestMessage = (latestMessages?.[0] as AiMessageRow | undefined)?.content_ro;
      const display = await fetchConversationDisplayName(conversation);
      return {
        ...conversation,
        structure_display_name: display?.title,
        structure_subtitle: display?.subtitle,
        message_count: count ?? 0,
        last_message_preview: latestMessage ? truncatePreview(latestMessage) : undefined,
      };
    }),
  );
}

export async function fetchAiConversationMessages(
  conversationId: string,
): Promise<AiConversationMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("role, content_ro, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AiConversationMessage[];
}

export async function deleteAiConversation(conversationId: string, userId: string) {
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteAllAiConversations(userId: string) {
  const { error } = await supabase.from("ai_conversations").delete().eq("user_id", userId);
  if (error) throw error;
}

export function dispatchAiHistoryRefresh() {
  window.dispatchEvent(new CustomEvent(AI_HISTORY_REFRESH_EVENT));
}

export function dispatchOpenAiConversation(conversation: OpenAiConversationDetail) {
  window.dispatchEvent(
    new CustomEvent<OpenAiConversationDetail>(AI_CONVERSATION_OPEN_EVENT, { detail: conversation }),
  );
}

export function dispatchAiConversationDeleted(conversationId: string) {
  window.dispatchEvent(
    new CustomEvent<string>(AI_CONVERSATION_DELETED_EVENT, { detail: conversationId }),
  );
}

export function formatConversationRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Number.isNaN(date.getTime())) return "";
  if (diffMs < minute) return "acum";
  if (diffMs < hour) return `acum ${Math.max(1, Math.floor(diffMs / minute))} min`;
  if (diffMs < day) return `acum ${Math.floor(diffMs / hour)} h`;
  if (diffMs < 2 * day) return "ieri";

  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function getConversationStructureLabel(
  conversation: Pick<
    AiConversationSummary,
    "model_selection_id" | "structure_slug" | "tissue" | "structure_display_name"
  >,
) {
  if (conversation.structure_display_name) return conversation.structure_display_name;
  if (conversation.model_selection_id) return humanizeStructureId(conversation.model_selection_id);
  if (conversation.structure_slug) return humanizeStructureId(conversation.structure_slug);
  if (conversation.tissue === "muschi") return "Mușchi";
  if (conversation.tissue === "os") return "Os";
  return "Structură";
}

async function fetchConversationDisplayName(
  conversation: Pick<AiConversationSummary, "model_selection_id" | "structure_slug" | "tissue">,
) {
  const structure = await fetchAnatomyStructureName({
    id: conversation.model_selection_id ?? conversation.structure_slug,
    regionId: conversation.structure_slug,
    tissue: conversation.tissue,
  });

  if (!structure) return null;
  return getAnatomyDisplayName({
    dbStructure: structure as AnatomyNameRecord,
    selection: {
      id: conversation.model_selection_id ?? conversation.structure_slug ?? "structura",
      side: "male",
      tissue: conversation.tissue ?? "os",
      label: structure.name_ro ?? undefined,
      labelEn: structure.english_name ?? undefined,
    },
  });
}

export function formatConversationTitle(title: string) {
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  if (cleanTitle.toLowerCase().startsWith("santix - ")) {
    return `Conversație — ${cleanTitle.slice(9).trim()}`;
  }
  return cleanTitle || "Conversație AI";
}

function humanizeStructureId(value: string) {
  return value
    .replace(/^muschi:/, "")
    .replace(/^os:/, "")
    .replace(/^tendon:/, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bmuschi\b/gi, "mușchi")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function truncatePreview(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 86 ? `${clean.slice(0, 83)}...` : clean;
}
