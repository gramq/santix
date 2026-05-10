import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  Layers,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Santix — Înțelege-ți corpul" },
      {
        name: "description",
        content:
          "Santix este introducerea către exploratorul anatomic 3D cu schelet, mușchi, tendoane, bibliotecă și quiz.",
      },
      { property: "og:title", content: "Santix — Înțelege-ți corpul" },
      {
        property: "og:description",
        content: "Platformă medicală 3D interactivă pentru anatomie, simptome și învățare rapidă.",
      },
    ],
  }),
  component: SantixLanding,
});

function SantixLanding() {
  return (
    <div className="santix-intro min-h-screen overflow-hidden bg-[#050709] text-white">
      <div className="pointer-events-none absolute inset-0 santix-grid" />
      <div className="pointer-events-none absolute inset-0 santix-aura" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px santix-scan" />

      <header className="relative z-10 flex items-center gap-4 px-6 py-5 md:px-10">
        <Link to="/" aria-label="Santix" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-300/45 bg-cyan-300/5 transition-colors hover:border-cyan-300/75">
            <span className="size-3 rounded bg-cyan-300" />
          </span>
          <span className="text-xl font-black tracking-[0.08em]">
            San<span className="text-cyan-300">tix</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <Link to="/quiz" className="transition hover:text-white">
            Quiz
          </Link>
        </nav>

        <Link
          to="/explorator"
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(0,242,254,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_0_44px_rgba(0,242,254,0.42)] md:ml-0"
        >
          Deschide explorerul
          <ArrowRight className="size-4" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-84px)] max-w-7xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.02fr_0.98fr] md:px-10">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.9)]" />
              Platformă medicală 3D interactivă
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-white md:text-7xl lg:text-8xl">
              Înțelege-ți
              <span className="block santix-title-gradient">corpul tău.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
              Santix te poartă din introducere direct în explorerul anatomic pe
              care l-ai construit: schelet, mușchi, tendoane, simptome și
              explicații clare într-o interfață 3D.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/explorator"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-500 px-7 py-4 text-sm font-bold text-black shadow-[0_0_38px_rgba(0,242,254,0.28)] transition hover:-translate-y-1 hover:shadow-[0_0_54px_rgba(0,242,254,0.45)]"
              >
                Explorează anatomia
                <MousePointerClick className="size-4" />
              </Link>
              <a
                href="#flux"
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-white/[0.02] px-7 py-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/55 hover:bg-cyan-300/5 hover:text-white"
              >
                Cum funcționează
                <Sparkles className="size-4 text-cyan-300" />
              </a>
            </div>

            <div className="mt-16 grid max-w-2xl grid-cols-3 gap-6">
              <IntroStat value="206" label="Oase" />
              <IntroStat value="640" label="Mușchi" />
              <IntroStat value="3D" label="Model interactiv" />
            </div>
          </div>

          <div className="relative hidden min-h-[620px] items-center justify-center md:flex">
            <NeonSkeletonPreview />
          </div>
        </section>

        <section id="anatomie" className="border-t border-cyan-300/10 px-6 py-24 md:px-10">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
            <Feature
              icon={Layers}
              title="Model în straturi"
              text="Comută între explorare rapidă și complexă pentru schelet, mușchi și tendoane."
            />
            <Feature
              icon={Brain}
              title="Asistent de simptome"
              text="Selectezi zona dureroasă și primești cauze posibile într-un format educațional."
            />
            <Feature
              icon={ShieldCheck}
              title="Învățare clinică ghidată"
              text="Bibliotecă, quiz și explicații anatomice structurate pentru înțelegere rapidă și verificabilă."
            />
          </div>
        </section>

        <section id="flux" className="px-6 pb-28 md:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Flux simplu
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-tight md:text-6xl">
                  Din intro intri direct în explorer.
                </h2>
              </div>
              <Link
                to="/explorator"
                className="hidden items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 md:inline-flex"
              >
                Începe acum
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <Step number="01" title="Identifici zona" text="Pornești de la corpul uman și alegi regiunea care te interesează: os, mușchi sau articulație." />
              <Step number="02" title="Explorezi anatomia" text="Modelul 3D îți arată structurile relevante și păstrează contextul vizual al selecției." />
              <Step number="03" title="Consolidezi informația" text="Continui cu explicații, bibliotecă și quiz pentru a transforma explorarea în învățare." />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function IntroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Activity;
  title: string;
  text: string;
}) {
  return (
    <article className="group rounded-3xl border border-cyan-300/10 bg-white/[0.035] p-7 shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-2 hover:border-cyan-300/35 hover:bg-cyan-300/[0.055] hover:shadow-[0_26px_90px_rgba(0,242,254,0.16)]">
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 transition-all duration-300 group-hover:scale-110 group-hover:border-cyan-300/45 group-hover:bg-cyan-300/15 group-hover:shadow-[0_0_34px_rgba(0,242,254,0.28)]">
        <Icon className="size-5" />
      </div>
      <h3 className="text-xl font-black tracking-tight text-white transition-colors group-hover:text-cyan-100">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400 transition-colors group-hover:text-slate-300">{text}</p>
    </article>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-2 hover:border-cyan-300/30 hover:bg-white/[0.055] hover:shadow-[0_24px_80px_rgba(0,242,254,0.12)]">
      <div className="text-5xl font-black text-cyan-300/15 transition-all duration-300 group-hover:text-cyan-300/35">
        {number}
      </div>
      <h3 className="mt-5 text-xl font-black text-white transition-colors group-hover:text-cyan-100">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400 transition-colors group-hover:text-slate-300">{text}</p>
    </article>
  );
}

const skeletonZones = [
  {
    id: "skull",
    label: "Craniu",
    description: "Protecție cerebrală și punct de pornire pentru simptome precum cefalee sau amețeală.",
    x: 170,
    y: 62,
  },
  {
    id: "chest",
    label: "Torace",
    description: "Coaste, stern și respirație. Ideal pentru explorarea durerilor toracice educaționale.",
    x: 170,
    y: 142,
  },
  {
    id: "arm",
    label: "Braț",
    description: "Umăr, humerus, cot și antebraț, cu accent pe mobilitate și traumatisme.",
    x: 114,
    y: 198,
  },
  {
    id: "pelvis",
    label: "Bazin",
    description: "Centura pelviană conectează coloana cu membrele inferioare.",
    x: 170,
    y: 272,
  },
  {
    id: "knee",
    label: "Genunchi",
    description: "Articulație complexă pentru stabilitate, mers și testarea durerilor mecanice.",
    x: 142,
    y: 350,
  },
  {
    id: "ankle",
    label: "Gleznă",
    description: "Stabilitate, propulsie și entorse frecvente în mișcare.",
    x: 198,
    y: 408,
  },
] as const;

function NeonSkeletonPreview() {
  const [activeZone, setActiveZone] = useState<(typeof skeletonZones)[number]>(skeletonZones[0]);

  return (
    <div className="relative h-[620px] w-[390px]">
      <div className="absolute inset-0 rounded-full bg-cyan-300/[0.045] blur-3xl" />
      <div className="absolute -left-5 top-40 size-20 rounded-full border border-cyan-300/12 bg-cyan-300/[0.015]" />
      <div className="absolute -right-4 bottom-24 size-16 rounded-full border border-cyan-300/12 bg-cyan-300/[0.015]" />

      <div className="relative h-full overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-[#03090b]/80 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <svg
          className="absolute inset-x-0 top-0 h-[500px] w-full santix-neon-skeleton"
          viewBox="0 0 340 560"
          role="img"
          aria-label="Schelet Santix interactiv"
        >
          <defs>
            <filter id="santix-neon-glow" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0.95  0 0 0 0 1  0 0 0 0.8 0"
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="santix-bone-lines" filter="url(#santix-neon-glow)">
            <circle className={activeZone.id === "skull" ? "is-active" : ""} cx="170" cy="76" r="24" />
            <circle cx="170" cy="76" r="14" />
            <path d="M166 98h8v28h-8z" />
            <path className={activeZone.id === "chest" ? "is-active" : ""} d="M132 130h76v112h-76z" />
            <path d="M170 130v112" />
            <path d="M136 148c19 4 31 11 34 22M204 148c-19 4-31 11-34 22" />
            <path d="M136 170c19 4 31 11 34 22M204 170c-19 4-31 11-34 22" />
            <path d="M137 192c18 4 30 11 33 22M203 192c-18 4-30 11-33 22" />
            <path d="M142 122l28 8 28-8" />
            <path className={activeZone.id === "arm" ? "is-active" : ""} d="M126 142h-19v76h19zM233 142h-19v76h19zM110 222h13v82h-13zM217 222h13v82h-13z" />
            <path d="M99 236h10v68H99zM230 236h10v68h-10z" />
            <path d="M96 304h31v15H96zM213 304h31v15h-31z" />
            <path className={activeZone.id === "pelvis" ? "is-active" : ""} d="M134 282c15-14 57-14 72 0 8 24-8 46-36 52-28-6-44-28-36-52z" />
            <path d="M148 304c10 8 34 8 44 0" />
            <path className={activeZone.id === "knee" ? "is-active" : ""} d="M142 338h20v96h-20zM178 338h20v96h-20z" />
            <path d="M137 434h28v18h-28zM175 434h28v18h-28z" />
            <path className={activeZone.id === "ankle" ? "is-active" : ""} d="M141 452h16v52h-16zM183 452h16v52h-16zM132 504h33l9 14h-50zM176 504h33l11 14h-51z" />
          </g>
        </svg>

        {skeletonZones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => setActiveZone(zone)}
            onMouseEnter={() => setActiveZone(zone)}
            className={[
              "santix-zone-button",
              activeZone.id === zone.id ? "is-active" : "",
            ].join(" ")}
            style={{ left: `${zone.x}px`, top: `${zone.y}px` }}
            aria-pressed={activeZone.id === zone.id}
          >
            <span className="santix-zone-ring" />
            <span className="santix-zone-dot" />
            <span className="santix-zone-label">{zone.label}</span>
          </button>
        ))}

        <div className="santix-selection-panel absolute bottom-5 left-5 right-5 rounded-2xl border border-cyan-300/15 bg-black/55 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            Zonă selectată
          </div>
          <div className="santix-selection-title mt-2 text-lg font-black text-white">{activeZone.label}</div>
          <p className="santix-selection-copy mt-1 text-xs leading-5 text-slate-400">{activeZone.description}</p>
        </div>
      </div>
    </div>
  );
}
