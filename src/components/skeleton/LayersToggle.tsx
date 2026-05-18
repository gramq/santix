import { Bone, Activity, HeartPulse, Layers as LayersIcon } from "lucide-react";

export type LayerMode = "skeleton" | "muscles" | "organs" | "complete";

interface Props {
  mode: LayerMode;
  onChange: (next: LayerMode) => void;
}

const ITEMS: Array<{
  key: LayerMode;
  label: string;
  hint: string;
  Icon: typeof Bone;
}> = [
  { key: "skeleton", label: "Schelet", hint: "Oase", Icon: Bone },
  { key: "muscles", label: "Sistem Muscular", hint: "Mușchi", Icon: Activity },
  { key: "organs", label: "Organe", hint: "Organe interne", Icon: HeartPulse },
  { key: "complete", label: "Anatomie Completă", hint: "Mod avansat", Icon: LayersIcon },
];

export function LayersToggle({ mode, onChange }: Props) {
  return (
    <div className="absolute left-6 bottom-6 glass-strong rounded-3xl p-3.5 w-[260px] fade-up">
      <div className="flex items-center gap-2 px-1.5 pb-2.5 mb-2 border-b border-primary/10">
        <LayersIcon className="size-3.5 text-primary" />
        <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-primary">
          Vizualizare Straturi
        </span>
      </div>
      <div className="space-y-1">
        {ITEMS.map(({ key, label, hint, Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={active}
              className={[
                "w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl transition-all text-left",
                active
                  ? "bg-primary/10 border border-primary/25"
                  : "bg-transparent border border-transparent hover:bg-muted/60",
              ].join(" ")}
            >
              <div
                className={[
                  "size-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold tracking-tight leading-tight">
                  {label}
                </div>
                <div className="text-[10.5px] text-muted-foreground leading-tight">{hint}</div>
              </div>
              <span
                className={[
                  "relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
                  active ? "border-primary bg-primary/15" : "border-muted-foreground/35 bg-muted-foreground/10",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-block h-2.5 w-2.5 rounded-full transition-transform",
                    active ? "scale-100 bg-primary shadow-[0_0_10px_rgba(0,242,254,0.75)]" : "scale-0 bg-primary",
                  ].join(" ")}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
