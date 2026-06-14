import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Bone, categoryLabels, categoryLabelsEn } from "@/data/bones";
import {
  X,
  BookMarked,
  Sparkles,
  Stethoscope,
  AlertTriangle,
  Activity,
  Layers,
  Bot,
  Compass,
  Send,
  UserRound,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { askSelectionAi, type AiContextSwitchAction } from "@/lib/ai-chat.functions";
import {
  analyzePainLocally,
  getPainLevelLabel,
  getPainQuestions,
  painLevels,
  validateAnswerConsistency,
  type SymptomAnalysis,
} from "@/data/painKnowledge";
import { classifyAnatomyStructure, translateCurriculumInfo } from "@/data/anatomyCurriculum";
import { getAnatomyDisplayName } from "@/data/anatomyDisplayNames";
import {
  fetchAnatomyStructureName,
  type AnatomyStructureNameRow,
} from "@/lib/anatomyStructures";
import {
  AI_CONVERSATION_DELETED_EVENT,
  dispatchAiHistoryRefresh,
  fetchAiConversationMessages,
} from "@/lib/aiHistory";
import type { BoneSelection, TissueType } from "./SkeletonScene";
import type { LayerMode } from "./LayersToggle";
import { getInternalOrgan, type InternalOrgan } from "@/data/internalOrgans";
import { localizeInternalOrgan } from "@/data/organLocalization";
import { useLanguage } from "@/lib/useLanguage";

interface Props {
  bone: Bone | null;
  selection: BoneSelection | null;
  onClose: () => void;
  onContextSwitch?: (action: AiContextSwitchAction) => void;
  preserveAiStateOnSelectionChange?: boolean;
  visualLayer?: LayerMode;
  openConversationId?: string | null;
}

type ContextSwitchSuggestion = {
  action: AiContextSwitchAction;
  prompt: string;
  conversationId: string;
  key: string;
};

type TechnicalDetail = {
  label: string;
  value: string;
};

type AnatomyDetailSource = Record<string, unknown>;

function shouldAutoRedirect(action: AiContextSwitchAction | undefined): boolean {
  return Boolean(
    action?.should_switch_context &&
    action.confidence === "high" &&
    action.target_layer &&
    action.target_structure_slug &&
    (action.selected_context_fit === "different_body_region_detected" ||
      action.selected_context_fit === "likely_muscular_but_bone_selected" ||
      action.selected_context_fit === "likely_bone_joint_but_muscle_selected"),
  );
}

function shouldShowContextSuggestion(action: AiContextSwitchAction | undefined) {
  if (shouldAutoRedirect(action)) return false;
  return Boolean(
    action?.should_switch_context &&
    action.confidence === "high" &&
    action.target_layer &&
    action.target_structure_slug &&
    (action.selected_context_fit === "likely_organ_but_other_selected" ||
      action.selected_context_fit === "red_flag_priority"),
  );
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getTechnicalDetails(input: {
  bone: Bone | null;
  selection: BoneSelection;
  dbStructure: AnatomyStructureNameRow | null;
  curriculum: ReturnType<typeof classifyAnatomyStructure>;
  functionText: string;
  labels: { origin: string; insertion: string; innervation: string; action: string };
  lang: "ro" | "en";
  organ?: InternalOrgan;
}): TechnicalDetail[] {
  const selectionSource = input.selection as unknown as AnatomyDetailSource;
  const boneSource = (input.bone ?? {}) as AnatomyDetailSource;
  const dbSource = (input.dbStructure ?? {}) as AnatomyDetailSource;
  const organ = input.organ ?? getInternalOrgan(input.selection.id);
  const region = input.selection.regionLabel ?? input.curriculum.subgroup ?? input.curriculum.group;
  const segment = input.curriculum.segment.toLowerCase();
  const group = input.curriculum.group.toLowerCase();
  const aspect = input.curriculum.aspect?.toLowerCase();
  const placementText = aspect
    ? `${input.curriculum.group}, ${input.curriculum.segment}, ${aspect}`
    : `${input.curriculum.group}, ${input.curriculum.segment}`;

  const isEn = input.lang === "en";

  const origin =
    firstString(
      selectionSource.origine, selectionSource.origin, selectionSource.origin_ro,
      dbSource.origine, dbSource.origin, dbSource.origin_ro,
      boneSource.origine, boneSource.origin, boneSource.origin_ro,
      organ?.technical.origin,
    ) ??
    (input.selection.tissue === "os"
      ? isEn
        ? `Part of ${input.curriculum.group.toLowerCase()}, in the ${input.curriculum.segment.toLowerCase()} segment.`
        : `Parte a ${input.curriculum.group.toLowerCase()}, în segmentul ${input.curriculum.segment.toLowerCase()}.`
      : isEn
        ? `Starting landmarks within ${placementText}.`
        : `Repere de pornire încadrate în ${placementText}.`);

  const insertion =
    firstString(
      selectionSource.inserție, selectionSource.insertie, selectionSource.insertion, selectionSource.insertion_ro,
      dbSource.inserție, dbSource.insertie, dbSource.insertion, dbSource.insertion_ro,
      boneSource.inserție, boneSource.insertie, boneSource.insertion, boneSource.insertion_ro,
      organ?.technical.insertion,
    ) ??
    (input.selection.tissue === "tendon"
      ? isEn
        ? `Associated with the ${region.toLowerCase()} area and force transmission to adjacent structures.`
        : `Asociată cu zona ${region.toLowerCase()} și transmiterea forței către structurile vecine.`
      : isEn
        ? `Continues to adjacent structures in the ${region.toLowerCase()} area, contributing to ${segment} segment movement.`
        : `Se continuă către structurile vecine din zona ${region.toLowerCase()}, contribuind la mișcarea segmentului ${segment}.`);

  const innervation =
    firstString(
      selectionSource.inervație, selectionSource.inervatie, selectionSource.innervation, selectionSource.innervation_ro,
      dbSource.inervație, dbSource.inervatie, dbSource.innervation, dbSource.innervation_ro,
      boneSource.inervație, boneSource.inervatie, boneSource.innervation, boneSource.innervation_ro,
      organ?.technical.innervation,
    ) ??
    (input.selection.tissue === "os"
      ? isEn
        ? "Not directly applicable as in muscles; sensitivity is related to the periosteum and adjacent structures."
        : "Nu se aplică direct ca la mușchi; sensibilitatea este legată de periost și structurile vecine."
      : isEn
        ? `Controlled by nerves serving the ${group} group; exact detail may vary depending on the selected fascicle.`
        : `Controlată de nervii care deservesc grupa ${group}; detaliul exact poate varia în funcție de fasciculul selectat.`);

  const action =
    firstString(
      selectionSource.acțiune, selectionSource.actiune, selectionSource.action, selectionSource.action_ro,
      dbSource.acțiune, dbSource.actiune, dbSource.action, dbSource.action_ro,
      boneSource.acțiune, boneSource.actiune, boneSource.action, boneSource.action_ro,
      boneSource.funcție, organ?.technical.action,
    ) ?? input.functionText;

  return [
    { label: input.labels.origin, value: origin },
    { label: input.labels.insertion, value: insertion },
    { label: input.labels.innervation, value: innervation },
    { label: input.labels.action, value: action },
  ];
}

export function BoneInfoPanel({
  bone,
  selection,
  onClose,
  onContextSwitch,
  preserveAiStateOnSelectionChange = false,
  visualLayer = "complete",
  openConversationId = null,
}: Props) {
  const { session, user } = useAuth();
  const { lang, t } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SymptomAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<
    Array<{ role: "assistant" | "user"; content: string }>
  >([]);
  const [aiInput, setAiInput] = useState("");
  const [aiConversationId, setAiConversationId] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [contextSuggestion, setContextSuggestion] = useState<ContextSwitchSuggestion | null>(null);
  const [dbStructureName, setDbStructureName] = useState<AnatomyStructureNameRow | null>(null);
  const previousSelectionKeyRef = useRef<string | null>(null);
  const previousLangRef = useRef(lang);
  const missingNameLogKeyRef = useRef<string | null>(null);
  const shownSuggestionKeysRef = useRef<Set<string>>(new Set());

  const MIN_WIDTH = 300;
  const MAX_WIDTH = 700;
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("bonePanelWidth") : null;
    return saved ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(saved))) : 360;
  });
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setPanelWidth(next);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setPanelWidth((w) => {
        localStorage.setItem("bonePanelWidth", String(w));
        return w;
      });
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const TISSUE_META: Record<
    TissueType,
    { label: string; Icon: typeof BookMarked; tagBg: string; tagText: string }
  > = {
    os: { label: t.bone_tissue_bone, Icon: BookMarked, tagBg: "bg-primary/15 border-primary/25", tagText: "text-primary" },
    muschi: { label: t.bone_tissue_muscle, Icon: Activity, tagBg: "bg-medical/15 border-medical/30", tagText: "text-medical" },
    tendon: { label: t.bone_tissue_tendon, Icon: Layers, tagBg: "bg-accent/15 border-accent/30", tagText: "text-accent-foreground" },
    organ: { label: t.bone_tissue_organ, Icon: HeartPulse, tagBg: "bg-primary/15 border-primary/30", tagText: "text-primary" },
  };

  useEffect(() => {
    if (previousLangRef.current === lang) return;
    previousLangRef.current = lang;
    setResult(null);
    setError(null);
    setAiInput("");
    setAiMessages([]);
    setAiConversationId(undefined);
    setAiError(null);
    setContextSuggestion(null);
  }, [lang]);

  useEffect(() => {
    const selectionKey = selection
      ? `${selection.side}:${selection.tissue}:${selection.regionId ?? ""}:${selection.id}`
      : null;
    if (previousSelectionKeyRef.current === selectionKey) return;
    previousSelectionKeyRef.current = selectionKey;
    if (preserveAiStateOnSelectionChange) return;
    setAnswers({});
    setResult(null);
    setError(null);
    setAiInput("");
    setAiMessages([]);
    setAiConversationId(undefined);
    setAiLoading(false);
    setAiError(null);
    setContextSuggestion(null);
  }, [preserveAiStateOnSelectionChange, selection]);

  useEffect(() => {
    if (!selection) { setDbStructureName(null); return; }
    let cancelled = false;
    fetchAnatomyStructureName({
      id: bone?.id ?? selection.id,
      label: selection.label,
      labelEn: selection.labelEn,
      regionId: selection.regionId,
      tissue: selection.tissue,
    }).then((structure) => { if (!cancelled) setDbStructureName(structure); });
    return () => { cancelled = true; };
  }, [bone?.id, selection]);

  useEffect(() => {
    if (!openConversationId) return;
    let cancelled = false;
    setAiLoading(true);
    setAiError(null);
    fetchAiConversationMessages(openConversationId)
      .then((messages) => {
        if (cancelled) return;
        setAiConversationId(openConversationId);
        setAiMessages(
          messages
            .filter((m) => m.role === "assistant" || m.role === "user")
            .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content_ro })),
        );
      })
      .catch(() => { if (!cancelled) setAiError(t.bone_err_reopen); })
      .finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  }, [openConversationId, t.bone_err_reopen]);

  useEffect(() => {
    const handleDeletedConversation = (event: Event) => {
      const deletedId = (event as CustomEvent<string>).detail;
      if (!deletedId || deletedId !== aiConversationId) return;
      setAiConversationId(undefined);
      setAiMessages([]);
      setAiInput("");
      setAiError(null);
      setAiLoading(false);
      setContextSuggestion(null);
    };
    window.addEventListener(AI_CONVERSATION_DELETED_EVENT, handleDeletedConversation);
    return () => window.removeEventListener(AI_CONVERSATION_DELETED_EVENT, handleDeletedConversation);
  }, [aiConversationId]);

  useEffect(() => {
    if (!import.meta.env.DEV || !selection) return;
    const display = getAnatomyDisplayName({ bone, selection, dbStructure: dbStructureName });
    if (!display.missing_ro_display_name) return;
    const key = `${selection.tissue}:${selection.id}:${selection.labelEn ?? selection.label ?? ""}`;
    if (missingNameLogKeyRef.current === key) return;
    missingNameLogKeyRef.current = key;
    console.warn("[Santix anatomy names] Missing Romanian display name", {
      id: selection.id, label: selection.label, labelEn: selection.labelEn, source: display.source,
    });
  }, [bone, dbStructureName, selection]);

  if (!selection) return null;

  const tissue = selection.tissue;
  const selectedOrgan = localizeInternalOrgan(
    tissue === "organ" ? getInternalOrgan(selection.id) : undefined,
    lang,
  );
  const aiLayer = tissue === "organ" ? "organs" : tissue === "muschi" ? "muscular" : "skeleton";
  const aiLayerLabel =
    tissue === "organ" ? t.layers_organs : aiLayer === "muscular" ? t.layers_muscles : t.layers_skeleton;
  const serverVisualLayer =
    visualLayer === "muscles" ? "muscular" : visualLayer === "organs" ? "organs" : visualLayer;
  const completeLayerNote = visualLayer === "complete" ? t.bone_full_mode_notice : null;
  const debugAiEnabled =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debugAi") === "1";
  const meta = TISSUE_META[tissue];
  const Icon = meta.Icon;
  const curriculumRaw = classifyAnatomyStructure({
    tissue, label: selection.label, labelEn: selection.labelEn, id: selection.id,
  });
  const curriculum = translateCurriculumInfo(curriculumRaw, lang);

  const displayInfo = getAnatomyDisplayName({ bone, selection, dbStructure: dbStructureName, lang });
  const displayName = selectedOrgan?.name ?? displayInfo.display_name;
  const displayTitle = selectedOrgan?.name ?? displayInfo.title;
  const aiStructureName = displayTitle;
  const categoryLabelsLang = lang === "en" ? categoryLabelsEn : categoryLabels;
  const categoryText = selectedOrgan?.category ?? (bone ? categoryLabelsLang[bone.category] : curriculum.group);

  const isEn = lang === "en";
  const description =
    selectedOrgan?.description ??
    (isEn ? bone?.description_en ?? bone?.description : bone?.description) ??
    (tissue === "organ"
      ? isEn ? "Internal organ included in the complete Santix visualization." : "Organ intern inclus în vizualizarea completă Santix."
      : tissue === "muschi"
      ? isEn
        ? "Part of the muscular system. It helps the body move by contracting and working with bones and tendons."
        : "Parte din sistemul muscular. Ajută corpul să se miște prin contractare și lucrează împreună cu oasele și tendoanele."
      : tissue === "tendon"
        ? isEn
          ? "Strong connective tissue that helps keep the area stable and passes force from muscle to bone."
          : "Țesut rezistent care ajută zona să fie stabilă și transmite forța de la mușchi către os."
        : isEn
          ? "Part of the skeleton. It helps support the body, protect nearby areas and make movement possible."
          : "Parte a scheletului. Ajută la susținerea corpului, protejează zone apropiate și face mișcarea posibilă.");

  const funcText = selectedOrgan?.function ?? (isEn ? bone?.functie_en ?? bone?.funcție : bone?.funcție) ?? curriculum.functionHint;
  const isCompleteAnatomyMode = visualLayer === "complete";
  const isOrganSelection = tissue === "organ";
  const hideAssistantInComplete = isCompleteAnatomyMode;

  const technicalDetails = getTechnicalDetails({
    bone, selection, dbStructure: dbStructureName, curriculum, functionText: funcText,
    organ: selectedOrgan,
    labels: {
      origin: t.bone_origin,
      insertion: t.bone_insertion,
      innervation: t.bone_innervation,
      action: t.bone_action,
    },
    lang,
  });

  const questions = getPainQuestions(tissue, lang, {
    structureId: selection.id,
    selectedName: displayName,
    segment: curriculum.segment,
    group: curriculum.group,
  });
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const canSubmit = answeredCount === questions.length;

  const handleAnalyze = () => {
    if (!canSubmit) return;
    setError(null);
    setResult(null);
    const consistency = validateAnswerConsistency(answers, lang);
    if (!consistency.ok) {
      setError(consistency.message ?? (isEn ? "Answers are contradictory. Review your selections." : "Răspunsurile se contrazic. Revizuiește selecțiile."));
      return;
    }
    setResult(analyzePainLocally({
      tissueType: tissue,
      selectedName: displayName,
      answers,
      segment: curriculum.segment,
      group: curriculum.group,
      structureId: selection.id,
      lang,
    }));
  };

  const submitAiPrompt = async (
    prompt: string,
    options: {
      appendUser?: boolean;
      suppressSuggestion?: boolean;
      conversationIdOverride?: string;
      overrideContext?: {
        tissue: TissueType;
        structureName: string;
        structureSlug: string;
        modelSelectionId: string;
        bodyRegion?: string;
        visualLayer: "skeleton" | "muscular" | "organs" | "complete";
        aiLayer: "skeleton" | "muscular" | "organs";
      };
    } = {},
  ) => {
    if (!prompt || aiLoading) return;

    if (!session?.access_token) {
      setAiError(t.bone_login_required);
      return;
    }

    if (options.appendUser !== false) {
      setAiMessages((current) => [...current, { role: "user", content: prompt }]);
      setAiInput("");
    }
    setAiError(null);
    setAiLoading(true);

    const requestContext = options.overrideContext ?? {
      tissue, structureName: aiStructureName,
      structureSlug: bone?.id ?? selection.id,
      modelSelectionId: bone?.id ?? selection.id,
      bodyRegion: curriculum.segment,
      visualLayer: serverVisualLayer, aiLayer,
    };

    try {
      const response = await askSelectionAi({
        data: {
          accessToken: session.access_token,
          question: prompt,
          ...requestContext,
          conversationId: options.conversationIdOverride ?? aiConversationId,
          lang,
        },
      });

      setAiConversationId(response.conversationId);
      dispatchAiHistoryRefresh();
      setAiMessages((current) => [...current, { role: "assistant", content: response.answer }]);

      const contextSwitch = response.contextSwitch;

      if (!options.suppressSuggestion && contextSwitch) {
        if (shouldAutoRedirect(contextSwitch)) {
          const action = contextSwitch;
          if (action.target_layer && action.target_structure_slug) {
            const nextTissue: TissueType =
              action.target_layer === "organs" ? "organ"
              : action.target_layer === "muscular" ? "muschi"
              : "os";
            const nextLayer =
              action.target_layer === "organs" ? "organs"
              : action.target_layer === "muscular" ? "muscular"
              : "skeleton";
            const nextOrgan = localizeInternalOrgan(
              nextTissue === "organ" ? getInternalOrgan(action.target_structure_slug) : undefined,
              lang,
            );
            const targetName =
              nextOrgan?.name ??
              action.target_body_region ??
              action.target_structure_slug.replace(/^muschi:/, "").replace(/-/g, " ");

            const regionLabel = action.target_body_region ?? targetName;
            const notice = isEn
              ? `I noticed your question is about **${regionLabel}**, not the current selection. Switching automatically.`
              : `Am observat că întrebarea ta este despre **${regionLabel}**, nu despre selecția curentă. Schimb selecția automat.`;
            setAiMessages((current) => [...current.slice(0, -1), { role: "assistant", content: notice }]);

            onContextSwitch?.(action);

            await submitAiPrompt(prompt, {
              appendUser: false,
              suppressSuggestion: true,
              overrideContext: {
                tissue: nextTissue,
                structureName: targetName,
                structureSlug: action.target_structure_slug,
                modelSelectionId: action.target_structure_slug,
                bodyRegion: action.target_body_region ?? curriculum.segment,
                visualLayer: nextLayer,
                aiLayer: nextLayer,
              },
            });
          }
        } else if (shouldShowContextSuggestion(contextSwitch)) {
          const suggestionKey = [contextSwitch.target_layer, contextSwitch.target_structure_slug, contextSwitch.selected_context_fit].join(":");
          if (!shownSuggestionKeysRef.current.has(suggestionKey)) {
            shownSuggestionKeysRef.current.add(suggestionKey);
            setContextSuggestion({ action: contextSwitch, prompt, conversationId: response.conversationId, key: suggestionKey });
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.bone_err_ai;
      setAiError(message);
      setAiMessages((current) => [...current, { role: "assistant", content: t.bone_err_start }]);
      if (import.meta.env.DEV) console.error("Santix AI conversation error", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAiPrompt(aiInput.trim());
  };

  const handleAcceptContextSuggestion = async () => {
    if (!contextSuggestion) return;
    const { action, prompt } = contextSuggestion;
    if (!action.target_layer || !action.target_structure_slug) return;

    const nextTissue: TissueType =
      action.target_layer === "organs" ? "organ" : action.target_layer === "muscular" ? "muschi" : "os";
    const nextLayer =
      action.target_layer === "organs" ? "organs" : action.target_layer === "muscular" ? "muscular" : "skeleton";
    const nextOrgan = localizeInternalOrgan(
      nextTissue === "organ" ? getInternalOrgan(action.target_structure_slug) : undefined,
      lang,
    );
    const targetName = nextOrgan?.name ?? action.target_body_region ?? action.target_structure_slug.replace(/^muschi:/, "");

    setContextSuggestion(null);
    onContextSwitch?.(action);

    await submitAiPrompt(prompt, {
      appendUser: false, suppressSuggestion: true,
      overrideContext: {
        tissue: nextTissue, structureName: targetName,
        structureSlug: action.target_structure_slug,
        modelSelectionId: action.target_structure_slug,
        bodyRegion: action.target_body_region ?? curriculum.segment,
        visualLayer: nextLayer, aiLayer: nextLayer,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 32, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 360, damping: 32 }}
      className="absolute right-6 top-6 bottom-24 glass-strong rounded-3xl flex flex-col overflow-hidden"
      style={{ width: panelWidth }}
    >
      <div
        onMouseDown={onResizeStart}
        className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 group flex items-center justify-center"
        title="Drag to resize"
      >
        <div className="w-[3px] h-12 rounded-full bg-white/10 group-hover:bg-primary/50 transition-colors duration-150" />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.2, ease: "easeOut" }}
        className="flex items-start justify-between gap-3 mb-5"
      >
        <div className="flex items-center gap-2">
          <div className={`size-10 rounded-2xl border flex items-center justify-center ${meta.tagBg}`}>
            <Icon className={`size-4 ${meta.tagText}`} />
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] tracking-[0.22em] uppercase font-semibold ${meta.tagText}`}>
              {meta.label}
            </span>
            <span className="text-[10px] tracking-wide text-muted-foreground">{categoryText}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label={t.auth_close}
          className="size-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
        >
          <X className="size-4" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.2, ease: "easeOut" }}
      >
        <h2 className="text-3xl font-bold tracking-tight leading-tight mb-1">{displayTitle}</h2>

        {bone && (
          <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-2xl bg-bone-glow/10 border border-bone-glow/20 w-fit">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {bone.count} {bone.count === 1 ? t.bone_count_singular : t.bone_count_plural} {isEn ? "in the body" : "în corp"}
            </span>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17, duration: 0.24, ease: "easeOut" }}
        className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1 -mr-1"
      >
        <Section title={t.bone_description}>
          <p className="text-sm leading-relaxed text-foreground/90">{description}</p>
        </Section>

        <AnimatePresence mode="wait" initial={false}>
          {isCompleteAnatomyMode && (
            <motion.div
              key="technical-details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {completeLayerNote && (
                <div className="mb-3 rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                  {completeLayerNote}
                </div>
              )}
              <TechnicalDetails details={technicalDetails} title={t.bone_details_title} subtitle={t.bone_details_subtitle} />
              {selectedOrgan && <OrganQuizSummary organ={selectedOrgan} />}
            </motion.div>
          )}
        </AnimatePresence>

        <Section title={t.bone_function}>
          <p className="text-sm leading-relaxed text-foreground/90">{funcText}</p>
        </Section>

        <Section title={t.bone_anatomical}>
          <div className="grid grid-cols-2 gap-2">
            <InfoChip label={t.bone_system} value={curriculum.system} />
            <InfoChip label={t.bone_segment} value={curriculum.segment} />
            <InfoChip label={t.bone_group} value={curriculum.group} />
            <InfoChip label={t.bone_subgroup} value={curriculum.subgroup ?? t.bone_general} />
            <InfoChip label={t.bone_face_plan} value={curriculum.aspect ?? t.bone_general_plan} />
          </div>
        </Section>

        <AnimatePresence mode="wait" initial={false}>
          {!hideAssistantInComplete ? (user ? (
            <motion.div
              key="ai-assistant"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="order-first pb-3 mb-1 border-b border-primary/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_4px_12px_-4px_oklch(0.62_0.20_255_/_0.45)]">
                  <Bot className="size-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{t.bone_ai_title}</h3>
                  <p className="text-[11px] text-muted-foreground">{t.bone_ai_subtitle}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-white/[0.04] p-3">
                {debugAiEnabled && completeLayerNote && (
                  <div className="mb-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    {completeLayerNote}
                  </div>
                )}
                <div className="mb-3 rounded-xl border border-primary/15 bg-primary/10 px-3 py-2 text-xs leading-relaxed text-foreground/90">
                  {tissue === "organ"
                    ? <>{t.bone_ai_organ_prompt(displayName)}</>
                    : <>{t.bone_ai_default_prompt(displayName)}</>}
                </div>

                {debugAiEnabled && (
                  <details className="mb-3 rounded-xl border border-primary/15 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-semibold text-foreground/80">{t.bone_debug_ai}</summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <InfoChip label={t.bone_mode} value={aiLayerLabel} />
                      <InfoChip label={t.bone_context} value={selection.label ?? selection.regionLabel ?? selection.id} />
                      <InfoChip label={t.bone_slug} value={bone?.id ?? selection.id} />
                      <InfoChip label={t.bone_original_name} value={aiStructureName} />
                    </div>
                  </details>
                )}

                {contextSuggestion && (
                  <ContextSwitchCard
                    action={contextSuggestion.action}
                    disabled={aiLoading}
                    onAccept={handleAcceptContextSuggestion}
                    onDismiss={() => setContextSuggestion(null)}
                  />
                )}

                <div className="max-h-[250px] space-y-2 overflow-y-auto pr-1">
                  {aiMessages.length === 0 ? (
                    <div className="rounded-xl border border-primary/10 bg-background/35 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      {tissue === "organ" ? t.bone_placeholder_organ : tissue === "os" ? t.bone_placeholder_injury : t.bone_placeholder_movement}
                    </div>
                  ) : (
                    aiMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={[
                          "flex gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed",
                          message.role === "user"
                            ? "border-primary/25 bg-primary/10 text-foreground"
                            : "border-white/10 bg-background/45 text-foreground/90",
                        ].join(" ")}
                      >
                        {message.role === "user" ? (
                          <UserRound className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        ) : (
                          <Bot className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        )}
                        <span className="whitespace-pre-line">{message.content}</span>
                      </div>
                    ))
                  )}
                  {aiLoading && (
                    <div className="flex gap-2 rounded-xl border border-white/10 bg-background/45 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      <Bot className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>{t.bone_reading}</span>
                    </div>
                  )}
                </div>

                {aiError && (
                  <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                    {aiError}
                  </div>
                )}

                <form onSubmit={handleAiSubmit} className="mt-3 flex gap-2">
                  <input
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    disabled={aiLoading}
                    placeholder={tissue === "organ" ? t.bone_placeholder_organ : tissue === "os" ? t.bone_placeholder_injury : t.bone_placeholder_movement}
                    className="min-w-0 flex-1 rounded-2xl border border-primary/20 bg-background/45 px-3 py-2 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !aiInput.trim()}
                    className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-all hover:-translate-y-[1px] hover:shadow-[0_0_22px_rgba(0,242,254,0.25)]"
                    aria-label={isEn ? "Send question" : "Trimite întrebarea"}
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </div>

              {!isCompleteAnatomyMode && (
                <div className="mt-3 rounded-2xl bg-destructive/8 border border-destructive/30 px-3.5 py-2.5 flex gap-2.5">
                  <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[11.5px] leading-snug text-destructive font-semibold">{t.bone_disclaimer}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`local-triage-${tissue}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="order-first pb-3 mb-1 border-b border-primary/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_4px_12px_-4px_oklch(0.62_0.20_255_/_0.45)]">
                  <Stethoscope className="size-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{t.bone_triage_label}</h3>
                  <p className="text-[11px] text-muted-foreground">{t.bone_triage_subtitle(displayTitle.toLowerCase())}</p>
                </div>
              </div>

              {isOrganSelection && (
                <div className="mb-3 rounded-2xl border border-primary/15 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                      <Bot className="size-4 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">{t.bone_ai_organs_label}</h3>
                      <p className="text-[11px] text-muted-foreground">{t.bone_login_organs}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-3">
                {questions.map((question, questionIndex) => (
                  <div key={question.id} className="rounded-2xl bg-white/[0.04] border border-primary/15 p-3">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                        {questionIndex + 1}
                      </span>
                      <p className="text-xs font-semibold leading-snug text-foreground/90">{question.question}</p>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {question.options.map((option, optionIndex) => {
                        const selected = answers[question.id] === optionIndex;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => { setAnswers((c) => ({ ...c, [question.id]: optionIndex })); setResult(null); }}
                            className={[
                              "rounded-xl border px-3 py-2 text-left text-xs leading-snug transition-all",
                              selected
                                ? "border-primary/35 bg-primary/10 text-primary font-semibold"
                                : "border-primary/15 bg-white/[0.04] text-foreground/80 hover:border-primary/30 hover:bg-primary/10",
                            ].join(" ")}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canSubmit}
                className={[
                  "mt-2.5 w-full h-10 rounded-2xl font-semibold text-sm tracking-tight",
                  "bg-gradient-to-br from-primary to-accent text-primary-foreground",
                  "shadow-[0_4px_14px_-4px_oklch(0.62_0.20_255_/_0.5)]",
                  "transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
                  !canSubmit ? "" : "hover:shadow-[0_8px_24px_-6px_oklch(0.62_0.20_255_/_0.65)] hover:-translate-y-[1px]",
                  "flex items-center justify-center gap-2",
                ].join(" ")}
              >
                <Sparkles className="size-4" />
                {t.bone_triage_calculate}
              </button>

              {!canSubmit && (
                <p className="mt-2 text-[11px] text-muted-foreground">{t.bone_triage_answer_all}</p>
              )}

              {error && (
                <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              {result && (
                <div className="mt-4 space-y-3 fade-up">
                  <div className={`rounded-2xl border px-3.5 py-2.5 ${painLevels[result.nivel].tone}`}>
                    <h4 className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1">{t.bone_triage_pain_level}</h4>
                    <p className="text-sm font-bold">{result.title ?? getPainLevelLabel(result.nivel, lang)}</p>
                    <p className="mt-1 text-xs leading-snug opacity-85">{result.explicatieNivel}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground font-semibold mb-1.5">{t.bone_triage_causes}</h4>
                    <ul className="space-y-1.5">
                      {result.cauze.map((c, i) => (
                        <li key={i} className="text-sm leading-snug text-foreground/90 pl-3.5 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:rounded-full before:bg-primary">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground font-semibold mb-1.5">{t.bone_triage_recommendation}</h4>
                    <p className="text-sm leading-relaxed text-foreground/90 rounded-2xl bg-accent/15 border border-accent/30 px-3.5 py-2.5">{result.recomandare}</p>
                  </div>
                  {result.redFlags.length > 0 && (
                    <div>
                      <h4 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground font-semibold mb-1.5">{t.bone_triage_signs}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.redFlags.map((flag) => (
                          <span key={flag} className="rounded-full bg-destructive/10 border border-destructive/25 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl bg-destructive/8 border border-destructive/30 px-3.5 py-2.5 flex gap-2.5">
                    <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-[11.5px] leading-snug text-destructive font-semibold">{t.bone_triage_disclaimer}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )) : null}
        </AnimatePresence>
      </motion.div>
      </div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function TechnicalDetails({ details, title, subtitle }: { details: TechnicalDetail[]; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-white/[0.04] p-3 shadow-[0_0_30px_-24px_rgba(0,242,254,0.9)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Layers className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-2">
        {details.map((detail) => (
          <div key={detail.label} className="rounded-2xl border border-primary/15 bg-background/40 px-3 py-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{detail.label}</p>
            <p className="text-xs leading-relaxed text-foreground/90">{detail.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrganQuizSummary({ organ }: { organ: InternalOrgan }) {
  const { t } = useLanguage();
  return (
    <div className="mt-3 rounded-2xl border border-primary/20 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold tracking-tight text-foreground">{t.bone_quick_q}</h3>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          {organ.difficulty === "incepator" ? t.bone_beginner : t.bone_medium}
        </span>
      </div>
      <div className="space-y-2">
        {organ.quiz.slice(0, 2).map((item) => (
          <div key={item.question} className="rounded-xl border border-primary/10 bg-background/35 px-3 py-2">
            <p className="text-xs font-semibold leading-snug text-foreground/90">{item.question}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextSwitchCard({
  action, disabled, onAccept, onDismiss,
}: {
  action: AiContextSwitchAction;
  disabled: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  const isOrganTarget = action.target_layer === "organs";
  const isMuscularTarget = action.target_layer === "muscular";
  const title = isOrganTarget ? t.bone_ctx_organ_title : isMuscularTarget ? t.bone_ctx_muscle_title : t.bone_ctx_bone_title;
  const description = isOrganTarget ? t.bone_ctx_organ_desc : isMuscularTarget ? t.bone_ctx_muscle_desc : t.bone_ctx_bone_desc;
  const buttonLabel = isOrganTarget ? t.bone_ctx_organ_go : isMuscularTarget ? t.bone_ctx_muscle_go : t.bone_ctx_bone_go;

  return (
    <div className="mb-3 fade-up rounded-2xl border border-primary/25 bg-primary/[0.075] p-3 shadow-[0_0_28px_-18px_oklch(0.62_0.20_255_/_0.9)]">
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-background/35 text-primary">
          <Compass className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-black tracking-tight text-foreground">{title}</h4>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              aria-label={t.bone_hide_rec}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p>
          <button
            type="button"
            onClick={onAccept}
            disabled={disabled}
            className="mt-2.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,242,254,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-primary/15 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-1">{label}</p>
      <p className="text-xs font-semibold leading-snug text-foreground/90">{value}</p>
    </div>
  );
}
