import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  Layers,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useLanguage } from "@/lib/useLanguage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Santix — Înțelege-ți corpul" },
      { name: "description", content: "Santix este introducerea către exploratorul anatomic 3D cu schelet, mușchi, tendoane, bibliotecă și quiz." },
      { property: "og:title", content: "Santix — Înțelege-ți corpul" },
      { property: "og:description", content: "Platformă medicală 3D interactivă pentru anatomie, simptome și învățare rapidă." },
    ],
  }),
  component: SantixLanding,
});

const skeletonZonesRo = [
  { id: "skull", label: "Craniu", description: "Protecție cerebrală și punct de pornire pentru simptome precum cefalee sau amețeală.", x: 170, y: 62 },
  { id: "chest", label: "Torace", description: "Coaste, stern și respirație. Ideal pentru explorarea durerilor toracice educaționale.", x: 170, y: 142 },
  { id: "arm", label: "Braț", description: "Umăr, humerus, cot și antebraț, cu accent pe mobilitate și traumatisme.", x: 114, y: 198 },
  { id: "pelvis", label: "Bazin", description: "Centura pelviană conectează coloana cu membrele inferioare.", x: 170, y: 272 },
  { id: "knee", label: "Genunchi", description: "Articulație complexă pentru stabilitate, mers și testarea durerilor mecanice.", x: 142, y: 350 },
  { id: "ankle", label: "Gleznă", description: "Stabilitate, propulsie și entorse frecvente în mișcare.", x: 198, y: 408 },
] as const;

const skeletonZonesEn = [
  { id: "skull", label: "Skull", description: "Brain protection and starting point for symptoms such as headache or dizziness.", x: 170, y: 62 },
  { id: "chest", label: "Thorax", description: "Ribs, sternum and breathing. Ideal for exploring educational chest pain.", x: 170, y: 142 },
  { id: "arm", label: "Arm", description: "Shoulder, humerus, elbow and forearm, with a focus on mobility and injuries.", x: 114, y: 198 },
  { id: "pelvis", label: "Pelvis", description: "The pelvic girdle connects the spine to the lower limbs.", x: 170, y: 272 },
  { id: "knee", label: "Knee", description: "Complex joint for stability, walking and testing mechanical pain.", x: 142, y: 350 },
  { id: "ankle", label: "Ankle", description: "Stability, propulsion and frequent sprains during movement.", x: 198, y: 408 },
] as const;

function RevealOnScroll({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, ease: [0, 0, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function SantixLanding() {
  const { lang, t } = useLanguage();

  return (
    <div className="santix-intro min-h-screen overflow-hidden bg-[#050709] text-white">
      <div className="pointer-events-none absolute inset-0 santix-grid" />
      <div className="pointer-events-none absolute inset-0 santix-aura" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px santix-scan" />

      <header className="relative z-10 flex items-center gap-4 px-6 py-5 md:px-10">
        <Link to="/" aria-label="Santix" className="flex items-center">
          <span className="text-xl font-black tracking-[0.08em]">
            San<span className="text-cyan-300">tix</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <Link to="/glosar" className="transition hover:text-white">{t.nav_ghid}</Link>
          <Link to="/quiz" className="transition hover:text-white">{t.nav_quiz}</Link>
        </nav>

        <Link
          to="/explorator"
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(0,242,254,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_0_44px_rgba(0,242,254,0.42)] md:ml-0"
        >
          {t.landing_start}
          <ArrowRight className="size-4" />
        </Link>
        <LanguageToggle />
        <ThemeToggle />
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-84px)] max-w-7xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.02fr_0.98fr] md:px-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0, 0, 0.2, 1] }}
              className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300 shadow-[0_0_28px_rgba(0,242,254,0.07),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
            >
              <span className="badge-dot-pulse size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.9)]" />
              {t.landing_hero_title}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.68, ease: [0, 0, 0.2, 1], delay: 0.07 }}
              className="text-[clamp(3.6rem,10.5vw,8.5rem)] font-black leading-[0.9] tracking-[-0.04em] text-white"
            >
              San<span className="santix-title-gradient">tix</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.62, ease: [0, 0, 0.2, 1], delay: 0.16 }}
              className="mt-8 max-w-xl text-lg leading-8 text-slate-400"
            >
              {t.landing_account_desc}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, ease: [0, 0, 0.2, 1], delay: 0.26 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link
                to="/explorator"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-500 px-7 py-4 text-sm font-bold text-black shadow-[0_0_38px_rgba(0,242,254,0.28)] transition hover:-translate-y-1 hover:shadow-[0_0_54px_rgba(0,242,254,0.45)]"
              >
                {t.landing_start}
                <MousePointerClick className="size-4" />
              </Link>
              <a
                href="#flux"
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-white/[0.02] px-7 py-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/55 hover:bg-cyan-300/5 hover:text-white"
              >
                {t.landing_how}
                <Sparkles className="size-4 text-cyan-300" />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, ease: [0, 0, 0.2, 1], delay: 0.36 }}
              className="mt-16 grid max-w-2xl grid-cols-3 gap-8"
            >
              <IntroStat value={t.landing_stat1_val} label={t.landing_stat1_label} />
              <IntroStat value={t.landing_stat2_val} label={t.landing_stat2_label} />
              <IntroStat value={t.landing_stat3_val} label={t.landing_stat3_label} />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.88, ease: [0, 0, 0.2, 1], delay: 0.12 }}
            className="relative hidden min-h-[620px] items-center justify-center md:flex"
          >
            <NeonSkeletonPreview lang={lang} selectedZoneLabel={t.landing_selected_zone} />
          </motion.div>
        </section>

        <section id="anatomie" className="border-t border-cyan-300/10 px-6 py-28 md:px-10">
          <RevealOnScroll className="mx-auto mb-16 max-w-7xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              {t.landing_features_title}
            </div>
            <h2 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
              {t.landing_feature1_desc}
            </h2>
          </RevealOnScroll>

          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
            <Feature icon={Layers} title={t.landing_feature1_title} text={t.landing_feature2_desc} delay={0} />
            <Feature icon={Brain} title={t.landing_feature2_title} text={t.landing_feature3_desc} delay={0.12} />
            <Feature icon={ShieldCheck} title={t.landing_feature3_title} text={t.landing_feature4_desc} delay={0.24} />
          </div>
        </section>

        <section id="flux" className="px-6 pb-32 md:px-10">
          <div className="mx-auto max-w-7xl">
            <RevealOnScroll className="mb-16 flex items-end justify-between gap-6">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  {t.landing_how_title}
                </div>
                <h2 className="max-w-2xl text-4xl font-black tracking-tight md:text-6xl">
                  {t.landing_how_subtitle}
                </h2>
              </div>
              <Link
                to="/explorator"
                className="hidden shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 md:inline-flex"
              >
                {t.landing_start}
                <ArrowRight className="size-4" />
              </Link>
            </RevealOnScroll>

            <div className="grid gap-5 md:grid-cols-3">
              <Step number={t.landing_step1_num} title={t.landing_step1_title} text={t.landing_step1_desc} delay={0} />
              <Step number={t.landing_step2_num} title={t.landing_step2_title} text={t.landing_step2_desc} delay={0.11} />
              <Step number={t.landing_step3_num} title={t.landing_step3_title} text={t.landing_step3_desc} delay={0.22} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function IntroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="group">
      <div className="stat-gradient text-4xl font-black tracking-[-0.04em]">{value}</div>
      <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 transition-colors group-hover:text-slate-400">{label}</div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
  delay = 0,
}: {
  icon: typeof Activity;
  title: string;
  text: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      whileHover={{ y: -8, transition: { type: "spring", stiffness: 360, damping: 30 } }}
      transition={{ duration: 0.72, ease: [0, 0, 0.2, 1], delay }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-cyan-300/12 bg-white/[0.035] p-8 shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition-[border-color,background-color,box-shadow] duration-300 hover:border-cyan-300/35 hover:bg-cyan-300/[0.055] hover:shadow-[0_26px_90px_rgba(0,242,254,0.16)]"
    >
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-300/[0.07] to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 transition-all duration-300 group-hover:scale-110 group-hover:border-cyan-300/45 group-hover:shadow-[0_0_28px_rgba(0,242,254,0.25)]">
        <Icon className="size-5" />
      </div>
      <h3 className="text-xl font-black tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400 transition-colors duration-300 group-hover:text-slate-300">{text}</p>
    </motion.div>
  );
}

function Step({
  number,
  title,
  text,
  delay = 0,
}: {
  number: string;
  title: string;
  text: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      whileHover={{ y: -8, transition: { type: "spring", stiffness: 360, damping: 30 } }}
      transition={{ duration: 0.72, ease: [0, 0, 0.2, 1], delay }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-8 transition-[border-color,background-color,box-shadow] duration-500 hover:border-cyan-300/25 hover:bg-white/[0.04] hover:shadow-[0_24px_80px_rgba(0,242,254,0.1)]"
    >
      <div className="pointer-events-none absolute -right-2 -top-4 select-none text-[9rem] font-black leading-none text-white/[0.038] transition-colors duration-500 group-hover:text-cyan-300/[0.065]">
        {number}
      </div>
      <div className="relative">
        <h3 className="text-xl font-black text-white transition-colors group-hover:text-cyan-100">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400 transition-colors group-hover:text-slate-300">{text}</p>
      </div>
    </motion.div>
  );
}

function NeonSkeletonPreview({ lang, selectedZoneLabel }: { lang: "ro" | "en"; selectedZoneLabel: string }) {
  const zones = lang === "en" ? skeletonZonesEn : skeletonZonesRo;
  const [activeZone, setActiveZone] = useState<(typeof zones)[number]>(zones[0]);

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
          aria-label="Santix interactive skeleton"
        >
          <defs>
            <filter id="santix-neon-glow" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0.95  0 0 0 0 1  0 0 0 0.8 0" />
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

        {zones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => setActiveZone(zone as typeof zones[number])}
            onMouseEnter={() => setActiveZone(zone as typeof zones[number])}
            className={["santix-zone-button", activeZone.id === zone.id ? "is-active" : ""].join(" ")}
            style={{ left: `${zone.x}px`, top: `${zone.y}px` }}
            aria-pressed={activeZone.id === zone.id}
          >
            <span className="santix-zone-ring" />
            <span className="santix-zone-dot" />
            <span className="santix-zone-label">{zone.label}</span>
          </button>
        ))}

        <div className="santix-selection-panel absolute bottom-5 left-5 right-5 rounded-2xl border border-cyan-300/15 bg-black/55 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">{selectedZoneLabel}</div>
          <div className="santix-selection-title mt-2 text-lg font-black text-white">{activeZone.label}</div>
          <p className="santix-selection-copy mt-1 text-xs leading-5 text-slate-400">{activeZone.description}</p>
        </div>
      </div>
    </div>
  );
}
