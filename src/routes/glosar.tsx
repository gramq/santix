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
      { name: "description", content: "Ghid Santix pentru alegerea între schelet, sistem muscular, organe și anatomie completă." },
      { property: "og:title", content: "Ghid de utilizare Santix — Santix" },
      { property: "og:description", content: "Explicații simple despre când alegi scheletul, mușchii, organele sau anatomia completă în Santix." },
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
        title: "Start with what you feel, not with the perfect medical term",
        body: [
          "You may not know at first whether the problem is bone, muscle, joint or something internal.",
          "Santix gives you an educational starting point and keeps the explanation careful. It does not diagnose.",
        ],
      },
      {
        Icon: Bone,
        eyebrow: "Skeleton",
        title: "When to choose Skeleton",
        body: [
          "Choose Skeleton when the pain appeared after a fall, hit or twist.",
          "It is a good starting point for deep pain, swelling after trauma, pain near a joint or questions about bones.",
          "Use it to understand structures such as the humerus, ribs, pelvis or knee bones in an educational way.",
        ],
        example: "I fell and my knee hurts. Start with Skeleton.",
      },
      {
        Icon: Dumbbell,
        eyebrow: "Muscular system",
        title: "When to choose Muscular System",
        body: [
          "Choose Muscular System when the pain appears during effort, sport or after an unusual movement.",
          "It is useful for cramps, soreness, strain-like pain or discomfort when you tense the area.",
          "Use it when you want to understand which muscles help with lifting, pushing, pulling, running or bending.",
        ],
        example: "My thigh hurts after running. Start with Muscular System.",
      },
      {
        Icon: Brain,
        eyebrow: "Organs",
        title: "When to choose Organs",
        body: [
          "Choose Organs when the question is about an internal area, such as breathing, digestion or chest/abdomen context.",
          "This mode is educational and helps you understand where organs are and what role they have.",
          "For strong, sudden or worrying symptoms, use Santix only as orientation and seek medical help.",
        ],
        example: "I want to understand where the lungs are and what they do. Start with Organs.",
      },
      {
        Icon: Layers,
        eyebrow: "Full anatomy",
        title: "When to choose Full Anatomy",
        body: [
          "Choose Full Anatomy when you want to see the whole region before deciding where to focus.",
          "It helps when you are not sure whether the question is about bone, muscle, joint or an internal structure.",
          "After you understand the area better, switch to the specific layer for clearer AI questions.",
        ],
        example: "I am not sure if the pain is muscle or joint-related. Start with Full Anatomy.",
      },
      {
        Icon: MousePointerClick,
        eyebrow: "AI assistant",
        title: "How to ask the educational AI assistant",
        body: [
          "First select a structure from the 3D model so Santix knows the context.",
          "Then write what you feel or what you want to understand, in normal words.",
          "The answer is educational and orientative, not a medical diagnosis.",
        ],
        examples: [
          "What is the role of the humerus?",
          "I do not know if it is bone or muscle pain.",
          "It hurts after I fell.",
          "It hurts when I flex my arm.",
        ],
      },
      {
        Icon: Sparkles,
        eyebrow: "You can adjust",
        title: "If the first choice is not perfect",
        body: [
          "You can change layer at any time.",
          "If you started with Skeleton but the description sounds muscular, Santix can guide you toward the Muscular System.",
          "If you started with a muscle but the pain followed a fall or impact, Skeleton may be a better next step.",
        ],
      },
    ];

    return { guideSections, flashCards: guideSections };
  }

  const guideSections = [
    {
      Icon: Brain,
      eyebrow: "Orientare",
      title: "Începi cu ce simți, nu cu termenul medical perfect",
      body: [
        "La început poate nu știi dacă problema ține de os, mușchi, articulație sau o zonă internă.",
        "Santix îți dă un punct de pornire educațional și păstrează explicația prudentă. Nu pune diagnostic.",
      ],
    },
    {
      Icon: Bone,
      eyebrow: "Schelet",
      title: "Când alegi Schelet",
      body: [
        "Alege Schelet când durerea a apărut după o căzătură, lovitură sau răsucire.",
        "Este un punct bun de pornire pentru durere profundă, umflare după traumatism, durere lângă articulație sau întrebări despre oase.",
        "Folosește-l ca să înțelegi educațional structuri precum humerusul, coastele, bazinul sau oasele genunchiului.",
      ],
      example: "Am căzut și mă doare genunchiul. Începe cu Schelet.",
    },
    {
      Icon: Dumbbell,
      eyebrow: "Sistem muscular",
      title: "Când alegi Sistem Muscular",
      body: [
        "Alege Sistem Muscular când durerea apare la efort, după sport sau după o mișcare neobișnuită.",
        "Este util pentru crampe, febră musculară, durere ca de întindere sau disconfort când încordezi zona.",
        "Folosește-l când vrei să vezi ce mușchi participă la ridicat, împins, tras, alergat sau îndoire.",
      ],
      example: "Mă doare coapsa după alergare. Începe cu Sistem Muscular.",
    },
    {
      Icon: Brain,
      eyebrow: "Organe",
      title: "Când alegi Organe",
      body: [
        "Alege Organe când întrebarea este despre o zonă internă, de exemplu respirație, digestie sau context toracic/abdominal.",
        "Modul este educațional și te ajută să înțelegi unde se află organele și ce rol au.",
        "Pentru simptome puternice, bruște sau îngrijorătoare, folosește Santix doar ca orientare și cere ajutor medical.",
      ],
      example: "Vreau să înțeleg unde sunt plămânii și ce rol au. Începe cu Organe.",
    },
    {
      Icon: Layers,
      eyebrow: "Anatomie completă",
      title: "Când alegi Anatomie completă",
      body: [
        "Alege Anatomie completă când vrei să vezi toată regiunea înainte să decizi unde te concentrezi.",
        "Este utilă dacă nu știi sigur dacă întrebarea ține de os, mușchi, articulație sau o structură internă.",
        "După ce înțelegi zona, poți trece pe stratul specific pentru întrebări AI mai clare.",
      ],
      example: "Nu știu dacă durerea ține de mușchi sau articulație. Începe cu Anatomie completă.",
    },
    {
      Icon: MousePointerClick,
      eyebrow: "Asistent AI",
      title: "Cum întrebi asistentul AI educațional",
      body: [
        "Mai întâi selectezi o structură din modelul 3D, ca Santix să știe contextul.",
        "Apoi scrii ce simți sau ce vrei să înțelegi, în cuvinte normale.",
        "Răspunsul este educațional și orientativ, nu diagnostic medical.",
      ],
      examples: [
        "Ce rol are humerusul?",
        "Nu știu dacă mă doare osul sau mușchiul.",
        "Mă doare după ce am căzut.",
        "Mă doare când încordez brațul.",
      ],
    },
    {
      Icon: Sparkles,
      eyebrow: "Poți ajusta",
      title: "Dacă prima alegere nu e perfectă",
      body: [
        "Poți schimba stratul oricând.",
        "Dacă ai început cu Schelet, dar descrierea pare musculară, Santix te poate orienta spre Sistemul Muscular.",
        "Dacă ai început cu un mușchi, dar durerea a apărut după o căzătură sau lovitură, Scheletul poate fi pasul următor mai potrivit.",
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
