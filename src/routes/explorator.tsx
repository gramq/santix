import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SkeletonScene, type BoneSelection } from "@/components/skeleton/SkeletonScene";
import { BoneInfoPanel } from "@/components/skeleton/BoneInfoPanel";
import { LayersToggle, type LayerMode } from "@/components/skeleton/LayersToggle";
import { bones } from "@/data/bones";
import { MousePointerClick } from "lucide-react";
import type { AiContextSwitchAction } from "@/lib/ai-chat.functions";
import {
  AI_CONVERSATION_OPEN_EVENT,
  getConversationStructureLabel,
  type OpenAiConversationDetail,
} from "@/lib/aiHistory";

export const Route = createFileRoute("/explorator")({
  head: () => ({
    meta: [
      { title: "Explorator Anatomie 3D — Santix" },
      {
        name: "description",
        content:
          "Explorează anatomia umană în 3D — schelet, mușchi și tendoane. Click pe orice structură pentru detalii și asistent AI de simptome.",
      },
      { property: "og:title", content: "Explorator Anatomie 3D — Santix" },
      {
        property: "og:description",
        content: "Vizualizare interactivă 3D a oaselor și sistemului muscular.",
      },
    ],
  }),
  component: ExploratorPage,
});

function ExploratorPage() {
  const [selection, setSelection] = useState<BoneSelection | null>(null);
  const [layerMode, setLayerMode] = useState<LayerMode>("complete");
  const [contextSwitchCount, setContextSwitchCount] = useState(0);
  const [preserveAiStateOnSelectionChange, setPreserveAiStateOnSelectionChange] = useState(false);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  const selectedBone = useMemo(
    () => (selection ? (bones.find((b) => b.id === selection.id) ?? null) : null),
    [selection],
  );

  const handleSelectionChange = (nextSelection: BoneSelection | null) => {
    setContextSwitchCount(0);
    setOpenConversationId(null);
    setSelection(nextSelection);
  };

  useEffect(() => {
    const handleOpenConversation = (event: Event) => {
      const conversation = (event as CustomEvent<OpenAiConversationDetail>).detail;
      if (!conversation?.id) return;

      const tissue: BoneSelection["tissue"] = conversation.tissue ?? "os";
      const structureId =
        conversation.model_selection_id ?? conversation.structure_slug ?? conversation.id;
      const targetBone =
        tissue === "os"
          ? bones.find((item) => item.id === structureId || item.id === conversation.structure_slug)
          : null;
      const label = getConversationStructureLabel(conversation) ?? targetBone?.name;

      setPreserveAiStateOnSelectionChange(true);
      setContextSwitchCount(0);
      setLayerMode(tissue === "organ" ? "complete" : tissue === "muschi" ? "muscles" : "skeleton");
      setOpenConversationId(conversation.id);
      setSelection({
        id: targetBone?.id ?? structureId,
        side: "male",
        tissue,
        regionId: tissue === "muschi" || tissue === "organ" ? structureId : undefined,
        regionLabel: tissue === "muschi" || tissue === "organ" ? label : undefined,
        label,
      });
      window.setTimeout(() => setPreserveAiStateOnSelectionChange(false), 0);
    };

    window.addEventListener(AI_CONVERSATION_OPEN_EVENT, handleOpenConversation);
    return () => window.removeEventListener(AI_CONVERSATION_OPEN_EVENT, handleOpenConversation);
  }, []);

  const handleAiContextSwitch = (action: AiContextSwitchAction) => {
    if (!action.should_switch_context || contextSwitchCount > 0 || !action.target_structure_slug)
      return;

    const nextLayer: LayerMode = action.target_layer === "muscular" ? "muscles" : "skeleton";
    const nextTissue: BoneSelection["tissue"] =
      action.target_structure_type === "muscle" || action.target_structure_type === "muscle_group"
        ? "muschi"
        : "os";
    const targetBone =
      nextTissue === "os" ? bones.find((item) => item.id === action.target_structure_slug) : null;
    const muscleLabels: Record<string, string> = {
      "muschi:muschii-bratului": "Mușchii brațului",
      "muschi:muschii-antebratului": "Mușchii antebrațului",
      "muschi:muschii-umarului": "Mușchii umărului",
      "muschi:muschii-mainii": "Mușchii mâinii",
      "muschi:muschii-coapsei": "Mușchii coapsei",
      "muschi:muschii-gambei": "Mușchii gambei",
      "muschi:muschii-piciorului": "Mușchii labei piciorului",
      "muschi:muschii-soldului": "Mușchii șoldului",
      "muschi:muschii-spatelui": "Mușchii spatelui",
      "muschi:muschii-capului-gatului": "Mușchii capului și gâtului",
      "muschi:muschii-toracelui": "Mușchii toracelui",
    };

    setPreserveAiStateOnSelectionChange(true);
    setContextSwitchCount((count) => count + 1);
    setLayerMode(nextLayer);
    setSelection({
      id: action.target_structure_slug,
      side: "male",
      tissue: nextTissue,
      regionId: nextTissue === "muschi" ? action.target_structure_slug : undefined,
      regionLabel:
        nextTissue === "muschi"
          ? muscleLabels[action.target_structure_slug]
          : (action.target_body_region ?? undefined),
      label:
        targetBone?.name ??
        muscleLabels[action.target_structure_slug] ??
        action.target_body_region ??
        action.target_structure_slug,
    });
    window.setTimeout(() => setPreserveAiStateOnSelectionChange(false), 0);
  };

  return (
    <div className="absolute inset-0 m-4 mt-2 overflow-hidden rounded-3xl glass">
      <SkeletonScene
        selection={selection}
        onSelect={handleSelectionChange}
        layerMode={layerMode}
        mode="complex"
      />

      {!selection && (
        <div className="absolute left-6 top-6 flex items-center gap-2.5 rounded-2xl px-4 py-3 glass fade-up">
          <MousePointerClick className="size-4 text-primary" />
          <span className="text-xs tracking-tight text-muted-foreground">
            Apasă pe un os, mușchi sau organ pentru detalii
          </span>
        </div>
      )}

      <LayersToggle
        mode={layerMode}
        onChange={(nextMode) => {
          handleSelectionChange(null);
          setLayerMode(nextMode);
        }}
      />

      <BoneInfoPanel
        bone={selectedBone}
        selection={selection}
        onClose={() => handleSelectionChange(null)}
        onContextSwitch={handleAiContextSwitch}
        preserveAiStateOnSelectionChange={preserveAiStateOnSelectionChange}
        visualLayer={layerMode}
        openConversationId={openConversationId}
      />
    </div>
  );
}
