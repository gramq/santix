import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
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

export const Route = createFileRoute("/glosar")({
  head: () => ({
    meta: [
      { title: "Ghid de utilizare Santix — Santix" },
      {
        name: "description",
        content: "Ghid Santix pentru alegerea scheletului 3D, sistemului muscular sau anatomiei complete.",
      },
      { property: "og:title", content: "Ghid de utilizare Santix — Santix" },
      {
        property: "og:description",
        content: "Sfaturi pentru utilizatori despre când să folosească scheletul, mușchii, anatomia completă și AI-ul Santix.",
      },
    ],
  }),
  component: GhidSantixPage,
});

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

const warningSigns = [
  "durere severă după accident",
  "deformare vizibilă",
  "imposibilitatea de a mișca zona",
  "amorțeală sau pierderea sensibilității",
  "umflare mare",
  "durere care se agravează",
  "durere care persistă mai multe zile",
];

const flashCards = [
  ...guideSections,
  {
    Icon: AlertTriangle,
    eyebrow: "Semne de alarmă",
    title: "Când ceri ajutor medical rapid",
    body: [
      "Cere ajutor medical rapid dacă apar semne care pot indica o problemă serioasă.",
      "Santix oferă orientare educațională, nu diagnostic medical.",
    ],
    examples: warningSigns,
  },
];

function GhidSantixPage() {
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const activeCard = activeCardIndex === null ? null : flashCards[activeCardIndex];

  const openCard = (index: number) => setActiveCardIndex(index);
  const closeCard = () => setActiveCardIndex(null);
  const nextCard = () => {
    setActiveCardIndex((current) => (current === null ? 0 : (current + 1) % flashCards.length));
  };
  const previousCard = () => {
    setActiveCardIndex((current) => (current === null ? flashCards.length - 1 : (current - 1 + flashCards.length) % flashCards.length));
  };

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
                  Ghid de utilizare Santix
                </span>
              </div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
                Alege mai ușor între <span className="text-gradient-bone">schelet</span>, mușchi și anatomie completă
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Santix oferă orientare educațională, nu diagnostic medical. Folosește ghidul ca punct de pornire când explorezi
                o durere, o mișcare sau o structură anatomică.
              </p>
            </div>

            <div className="santix-guide-hologram hidden lg:block" aria-hidden="true">
              <span />
              <span />
              <span />
              <div />
            </div>
          </div>
        </div>

        <main className="grid gap-4 p-6 lg:grid-cols-2">
          {guideSections.map(({ Icon, eyebrow, title, body, example, examples }, index) => (
            <button
              type="button"
              key={title}
              onClick={() => openCard(index)}
              className="santix-guide-card glass rounded-3xl p-5 text-left fade-up"
              style={{ animationDelay: `${Math.min(index * 35, 220)}ms` }}
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="santix-guide-icon flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
                {body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {example && (
                <p className="santix-guide-example mt-4 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                  Exemplu: „{example}”
                </p>
              )}

              {examples && (
                <div className="mt-4 grid gap-2">
                  {examples.map((item) => (
                    <p key={item} className="santix-guide-example rounded-2xl border border-primary/10 bg-white/[0.035] px-4 py-2 text-sm">
                      „{item}”
                    </p>
                  ))}
                </div>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={() => openCard(flashCards.length - 1)}
            className="santix-guide-card santix-guide-warning glass rounded-3xl border border-destructive/25 p-5 text-left fade-up lg:col-span-2"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="santix-guide-icon flex size-10 shrink-0 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive/80">Semne de alarmă</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">Când ceri ajutor medical rapid</h2>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {warningSigns.map((sign) => (
                <div key={sign} className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm">
                  {sign}
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Santix oferă orientare educațională, nu diagnostic medical.
            </p>
          </button>
        </main>
      </div>

      {activeCard && (
        <div className="santix-flash-overlay absolute inset-0 z-30 flex items-center justify-center p-4" onClick={closeCard}>
          <div className="santix-flash-stage w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <article key={activeCardIndex} className="santix-flash-card glass-strong rounded-3xl p-6 md:p-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="santix-guide-icon flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                    <activeCard.Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {activeCard.eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{activeCard.title}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCard}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-muted-foreground transition hover:text-foreground"
                  aria-label="Închide cardul"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-foreground/85 md:text-base">
                {activeCard.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {activeCard.example && (
                <p className="mt-5 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                  Exemplu: „{activeCard.example}”
                </p>
              )}

              {activeCard.examples && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {activeCard.examples.map((item) => (
                    <p key={item} className="rounded-2xl border border-primary/10 bg-white/[0.035] px-4 py-2 text-sm">
                      „{item}”
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-primary/10 pt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {activeCardIndex! + 1} / {flashCards.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={previousCard}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={nextCard}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
                  >
                    Următorul
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}
