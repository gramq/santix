import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  SkeletonScene,
  type AnatomyModelMode,
  type BoneSelection,
} from "@/components/skeleton/SkeletonScene";
import { BoneInfoPanel } from "@/components/skeleton/BoneInfoPanel";
import { LayersToggle, type LayerMode } from "@/components/skeleton/LayersToggle";
import { bones } from "@/data/bones";
import { MousePointerClick } from "lucide-react";
import type { AiContextSwitchAction } from "@/lib/ai-chat.functions";

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
  const [modelMode, setModelMode] = useState<AnatomyModelMode>("simple");
  const [contextSwitchCount, setContextSwitchCount] = useState(0);
  const [preserveAiStateOnSelectionChange, setPreserveAiStateOnSelectionChange] = useState(false);

  const selectedBone = useMemo(
    () => (selection ? bones.find((b) => b.id === selection.id) ?? null : null),
    [selection],
  );

  const handleSelectionChange = (nextSelection: BoneSelection | null) => {
    setContextSwitchCount(0);
    setSelection(nextSelection);
  };

  const handleAiContextSwitch = (action: AiContextSwitchAction) => {
    if (!action.should_switch_context || contextSwitchCount > 0 || !action.target_structure_slug) return;

    const nextLayer: LayerMode =
      action.target_layer === "muscular"
        ? "muscles"
        : "skeleton";
    const nextTissue: BoneSelection["tissue"] =
      action.target_structure_type === "muscle" || action.target_structure_type === "muscle_group"
        ? "muschi"
        : "os";
    const targetBone = nextTissue === "os" ? bones.find((item) => item.id === action.target_structure_slug) : null;
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
    setModelMode("complex");
    setLayerMode(nextLayer);
    setSelection({
      id: action.target_structure_slug,
      side: "male",
      tissue: nextTissue,
      regionId: nextTissue === "muschi" ? action.target_structure_slug : undefined,
      regionLabel: nextTissue === "muschi" ? muscleLabels[action.target_structure_slug] : action.target_body_region ?? undefined,
      label: targetBone?.name ?? muscleLabels[action.target_structure_slug] ?? action.target_body_region ?? action.target_structure_slug,
    });
    window.setTimeout(() => setPreserveAiStateOnSelectionChange(false), 0);
  };

  return (
    <div className="absolute inset-0 m-4 mt-2 overflow-hidden rounded-3xl glass">
      <SkeletonScene
        selection={selection}
        onSelect={handleSelectionChange}
        layerMode={layerMode}
        mode={modelMode}
      />

      {!selection && (
        <div className="absolute left-6 top-6 flex items-center gap-2.5 rounded-2xl px-4 py-3 glass fade-up">
          <MousePointerClick className="size-4 text-primary" />
          <span className="text-xs tracking-tight text-muted-foreground">
            Apasă pe un os sau mușchi pentru detalii
          </span>
        </div>
      )}

      <div className="absolute right-6 top-6 flex items-center gap-1 rounded-2xl p-1.5 glass fade-up">
        {(["simple", "complex"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
          onClick={() => {
              handleSelectionChange(null);
              setModelMode(mode);
            }}
            className={[
              "rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-all",
              modelMode === mode
                ? "bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_oklch(0.62_0.20_255_/_0.7)]"
                : "text-muted-foreground hover:bg-muted/70",
            ].join(" ")}
          >
            {mode === "simple" ? "Rapid" : "Complex"}
          </button>
        ))}
      </div>

      {modelMode === "complex" && (
        <LayersToggle
          mode={layerMode}
          onChange={(nextMode) => {
            handleSelectionChange(null);
            setLayerMode(nextMode);
          }}
        />
      )}

      <BoneInfoPanel
        bone={selectedBone}
        selection={selection}
        onClose={() => handleSelectionChange(null)}
        onContextSwitch={handleAiContextSwitch}
        preserveAiStateOnSelectionChange={preserveAiStateOnSelectionChange}
        visualLayer={layerMode}
      />
    </div>
  );
}
