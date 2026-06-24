import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bone,
  ChevronLeft,
  Brain,
  ChevronRight,
  Dumbbell,
  Layers,
  MousePointerClick,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";

export const Route = createFileRoute("/glosar")({
  head: () => ({
    meta: [
      { title: "Ghid de utilizare Santix — Santix" },
      { name: "description", content: "Ghid Santix pentru alegerea scheletului 3D, sistemului muscular sau anatomiei complete." },
      { property: "og:title", content: "Ghid de utilizare Santix — Santix" },
      { property: "og:description", content: "Sfaturi pentru utilizatori despre când să folosească scheletul, mușchii, anatomia completă și AI-ul Santix." },
    ],
  }),
  component: GhidSantixPage,
});

function buildContent(lang: "ro" | "en") {
  if (lang === "en") {
    const guideSections = [
      {
        Icon: Brain,
        eyebrow: "Orientation",
        title: "You don't need to know exactly whether your bone or muscle hurts",
        body: [
          "Pain can come from a bone, muscle, tendon, joint or nerve.",
          "Santix helps you get oriented, but does not diagnose.",
        ],
      },
      {
        Icon: Bone,
        eyebrow: "Skeleton",
        title: "When to choose Skeleton",
        body: [
          "Choose Skeleton if the pain appeared after an impact, fall or accident.",
          "Useful when the pain feels deep, the area swelled after trauma, or the pain is near a joint.",
          "Also use it when you want to understand bones, joints, or suspect a bone issue such as a fracture or dislocation.",
        ],
        example: "I fell and my arm hurts. Start with Skeleton.",
      },
      {
        Icon: Dumbbell,
        eyebrow: "Muscular system",
        title: "When to choose Muscular System",
        body: [
          "Choose Muscular System if the pain appeared after exercise or sport.",
          "Suitable for cramps, strain, muscle soreness or pain when tensing the area.",
          "Use it when pain occurs while lifting, pushing, pulling, running, or when you want to see which muscles are involved in a movement.",
        ],
        example: "My arm hurts after the gym. Start with Muscular System.",
      },
      {
        Icon: Layers,
        eyebrow: "Full anatomy",
        title: "When to choose Full Anatomy",
        body: [
          "Choose Full Anatomy if you're not sure whether the pain comes from a bone or a muscle.",
          "Useful when you want to see the complete area or the pain seems related to both movement and joint.",
          "Use this mode when you need broader context.",
        ],
        example: "My arm hurts but I'm not sure from where. Start with Full Anatomy.",
      },
      {
        Icon: MousePointerClick,
        eyebrow: "AI assistant",
        title: "How to use the AI",
        body: [
          "To start the AI, select a bone or muscle from the 3D model.",
          "Write what you feel or what you want to know.",
          "You can ask about the structure's role, pain, movement or injuries.",
        ],
        examples: [
          "What is the role of the humerus?",
          "It hurts here.",
          "It hurts after I fell.",
          "It hurts when I flex my arm.",
        ],
      },
      {
        Icon: Sparkles,
        eyebrow: "Flexible",
        title: "If you chose wrong",
        body: [
          "It's not a problem.",
          "If you selected a bone but the pain seems muscular, the AI can guide you to also check the Muscular System.",
          "If you selected a muscle but the pain appeared after a fall or impact, the AI can guide you to also check the Skeleton.",
        ],
      },
    ];

    return { guideSections, flashCards: guideSections };
  }

  const guideSections = [
    {
      Icon: Brain,
      eyebrow: "Orientare",
      title: "Nu trebuie să știi exact dacă te doare osul sau mușchiul",
      body: [
        "Durerea poate veni din os, mușchi, tendon, articulație sau nerv.",
        "Santix te ajută să te orientezi, dar nu pune diagnostic.",
      ],
    },
    {
      Icon: Bone,
      eyebrow: "Schelet",
      title: "Când alegi Schelet",
      body: [
        "Alege Schelet dacă durerea a apărut după o lovitură, căzătură sau accident.",
        "Este util când durerea pare profundă, zona s-a umflat după traumatism sau durerea este lângă o articulație.",
        "Folosește-l și când vrei să înțelegi oasele, articulațiile sau suspectezi o problemă osoasă, cum ar fi fractură sau luxație.",
      ],
      example: "Am căzut și mă doare brațul. Începe cu Schelet.",
    },
    {
      Icon: Dumbbell,
      eyebrow: "Sistem muscular",
      title: "Când alegi Sistem Muscular",
      body: [
        "Alege Sistem Muscular dacă durerea a apărut după efort sau sport.",
        "Este potrivit pentru crampe, întindere, febră musculară sau durere când încordezi zona.",
        "Folosește-l când durerea apare la ridicat, împins, tras, alergat sau când vrei să vezi ce mușchi participă la o mișcare.",
      ],
      example: "Mă doare brațul după sală. Începe cu Sistem Muscular.",
    },
    {
      Icon: Layers,
      eyebrow: "Anatomie completă",
      title: "Când alegi Anatomie completă",
      body: [
        "Alege Anatomie completă dacă nu ești sigur dacă durerea vine din os sau mușchi.",
        "Este utilă când vrei să vezi zona completă sau durerea pare legată și de mișcare, și de articulație.",
        "Folosește acest mod când ai nevoie de context mai larg.",
      ],
      example: "Mă doare brațul, dar nu știu exact de unde. Începe cu Anatomie completă.",
    },
    {
      Icon: MousePointerClick,
      eyebrow: "Asistent AI",
      title: "Cum folosești AI-ul",
      body: [
        "Pentru a porni AI-ul, selectează un os sau mușchi din modelul 3D.",
        "Scrie ce simți sau ce vrei să afli.",
        "Poți întreba despre rolul structurii, durere, mișcare sau accidentări.",
      ],
      examples: [
        "Ce rol are humerusul?",
        "Mă doare aici.",
        "Mă doare după ce am căzut.",
        "Mă doare când încordez brațul.",
      ],
    },
    {
      Icon: Sparkles,
      eyebrow: "Flexibil",
      title: "Dacă ai ales greșit",
      body: [
        "Nu este o problemă.",
        "Dacă ai selectat un os, dar durerea pare musculară, AI-ul te poate orienta să verifici și Sistemul Muscular.",
        "Dacă ai selectat un mușchi, dar durerea a apărut după o căzătură sau lovitură, AI-ul te poate orienta să verifici și Scheletul.",
      ],
    },
  ];

  return { guideSections, flashCards: guideSections };
}

function GhidSantixPage() {
  const { lang, t } = useLanguage();
  const { guideSections, flashCards } = buildContent(lang);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const activeCard = activeCardIndex === null ? null : flashCards[activeCardIndex];

  const openCard = (index: number) => setActiveCardIndex(index);
  const closeCard = () => setActiveCardIndex(null);
  const nextCard = () => setActiveCardIndex((c) => (c === null ? 0 : (c + 1) % flashCards.length));
  const previousCard = () => setActiveCardIndex((c) => (c === null ? flashCards.length - 1 : (c - 1 + flashCards.length) % flashCards.length));

  return (
    <div className="santix-guide-shell absolute inset-0 m-4 mt-2 overflow-hidden rounded-3xl glass">
      <div className="pointer-events-none absolute inset-0 santix-aura" />
      <div className="pointer-events-none absolute inset-0 santix-guide-grid" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px santix-scan" />

      <div className="relative z-10 h-full overflow-y-auto">
        <div className="santix-guide-hero border-b border-primary/10 px-6 py-7">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <Sparkles className="size-5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t.ghid_title}
                </span>
              </div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
                {t.ghid_subtitle.split("schelet").length > 1
                  ? <>{t.ghid_subtitle.split("schelet")[0]}<span className="text-gradient-bone">{lang === "ro" ? "schelet" : "skeleton"}</span>{t.ghid_subtitle.split(lang === "ro" ? "schelet" : "skeleton")[1]}</>
                  : t.ghid_subtitle}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t.ghid_disclaimer}</p>
            </div>

            <div className="santix-guide-hologram hidden lg:block" aria-hidden="true">
              <span /><span /><span /><div />
            </div>
          </div>
        </div>

        <motion.main
          className="grid gap-4 p-6 lg:grid-cols-2"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
          initial="hidden"
          animate="visible"
        >
          {guideSections.map(({ Icon, eyebrow, title, body, example, examples }, index) => (
            <motion.button
              type="button"
              key={title}
              onClick={() => openCard(index)}
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.96, filter: "blur(8px)" },
                visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
                  transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
              }}
              whileHover={{ y: -6, scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 24 } }}
              whileTap={{ scale: 0.98 }}
              className="santix-guide-card glass rounded-3xl p-5 text-left"
            >
              <div className="mb-4 flex items-start gap-3">
                <motion.div
                  className="santix-guide-icon flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10"
                  whileHover={{ scale: 1.15, rotate: 8, boxShadow: "0 0 20px oklch(0.82 0.17 205 / 0.45)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <Icon className="size-5 text-primary" />
                </motion.div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
                {body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>

              {example && (
                <p className="santix-guide-example mt-4 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                  {t.ghid_example} „{example}"
                </p>
              )}

              {examples && (
                <div className="mt-4 grid gap-2">
                  {examples.map((item) => (
                    <p key={item} className="santix-guide-example rounded-2xl border border-primary/10 bg-white/[0.035] px-4 py-2 text-sm">
                      „{item}"
                    </p>
                  ))}
                </div>
              )}
            </motion.button>
          ))}

        </motion.main>
      </div>

      {/* ── Flash card modal with AnimatePresence ── */}
      <AnimatePresence>
      {activeCard && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="santix-flash-overlay absolute inset-0 z-30 flex items-center justify-center p-4"
          onClick={closeCard}
        >
          <motion.div
            key={activeCardIndex}
            initial={{ opacity: 0, scale: 0.85, y: 48, filter: "blur(18px)", rotateX: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -32, filter: "blur(12px)" }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="santix-flash-stage w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <article className="santix-flash-card glass-strong rounded-3xl p-6 md:p-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="santix-guide-icon flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                    <activeCard.Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{activeCard.eyebrow}</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{activeCard.title}</h2>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={closeCard}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-muted-foreground hover:text-foreground"
                  aria-label={t.ghid_close}
                >
                  <X className="size-5" />
                </motion.button>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-foreground/85 md:text-base">
                {activeCard.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>

              {activeCard.example && (
                <p className="mt-5 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                  {t.ghid_example} „{activeCard.example}"
                </p>
              )}

              {activeCard.examples && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {activeCard.examples.map((item) => (
                    <p key={item} className="rounded-2xl border border-primary/10 bg-white/[0.035] px-4 py-2 text-sm">„{item}"</p>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-primary/10 pt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {activeCardIndex! + 1} / {flashCards.length}
                </p>
                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={previousCard}
                    whileHover={{ scale: 1.05, x: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary/35 hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                    {t.ghid_prev}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={nextCard}
                    whileHover={{ scale: 1.05, x: 3 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors"
                  >
                    {t.ghid_next}
                    <ChevronRight className="size-4" />
                  </motion.button>
                </div>
              </div>
            </article>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
