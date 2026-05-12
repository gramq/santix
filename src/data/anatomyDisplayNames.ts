import type { Bone } from "@/data/bones";
import type { BoneSelection, TissueType } from "@/components/skeleton/SkeletonScene";

export interface AnatomyDisplayName {
  common_name_ro?: string;
  scientific_name_ro?: string;
  latin_name?: string;
  original_name: string;
  display_name: string;
  title: string;
  subtitle?: string;
  missing_common_name_ro: boolean;
}

interface DisplayRule {
  terms: string[];
  common_name_ro: string;
  scientific_name_ro: string;
  tissue?: TissueType;
}

const muscleDisplayRules: DisplayRule[] = [
  {
    terms: ["brachioradialis", "brahioradial"],
    common_name_ro: "Mușchiul antebrațului",
    scientific_name_ro: "brahioradial",
    tissue: "muschi",
  },
  {
    terms: ["biceps brachii", "biceps brahial"],
    common_name_ro: "Mușchiul bicepsului",
    scientific_name_ro: "biceps brahial",
    tissue: "muschi",
  },
  {
    terms: ["triceps brachii", "triceps brahial"],
    common_name_ro: "Mușchiul tricepsului",
    scientific_name_ro: "triceps brahial",
    tissue: "muschi",
  },
  {
    terms: ["deltoid"],
    common_name_ro: "Mușchiul umărului",
    scientific_name_ro: "deltoid",
    tissue: "muschi",
  },
  {
    terms: ["gluteus maximus", "fesier mare"],
    common_name_ro: "Mușchiul fesier mare",
    scientific_name_ro: "gluteus maximus",
    tissue: "muschi",
  },
  {
    terms: ["gluteus medius", "fesier mijlociu"],
    common_name_ro: "Mușchiul fesier lateral",
    scientific_name_ro: "gluteus medius",
    tissue: "muschi",
  },
  {
    terms: ["gluteus minimus", "fesier mic"],
    common_name_ro: "Mușchiul fesier profund",
    scientific_name_ro: "gluteus minimus",
    tissue: "muschi",
  },
  {
    terms: ["external abdominal oblique", "oblic extern abdominal"],
    common_name_ro: "Mușchi abdominal lateral",
    scientific_name_ro: "oblic extern abdominal",
    tissue: "muschi",
  },
  {
    terms: ["internal abdominal oblique", "oblic intern abdominal"],
    common_name_ro: "Mușchi abdominal lateral profund",
    scientific_name_ro: "oblic intern abdominal",
    tissue: "muschi",
  },
  {
    terms: ["rectus abdominis", "drept abdominal"],
    common_name_ro: "Mușchiul abdomenului din față",
    scientific_name_ro: "drept abdominal",
    tissue: "muschi",
  },
  {
    terms: ["transversus abdominis", "transvers abdominal"],
    common_name_ro: "Mușchi abdominal profund",
    scientific_name_ro: "transvers abdominal",
    tissue: "muschi",
  },
  {
    terms: ["gastrocnemius", "gastrocnemian"],
    common_name_ro: "Mușchiul gambei",
    scientific_name_ro: "gastrocnemian",
    tissue: "muschi",
  },
  {
    terms: ["soleus"],
    common_name_ro: "Mușchiul profund al gambei",
    scientific_name_ro: "soleus",
    tissue: "muschi",
  },
  {
    terms: ["rectus femoris", "vastus", "quadriceps", "cvadriceps"],
    common_name_ro: "Mușchiul coapsei din față",
    scientific_name_ro: "cvadriceps",
    tissue: "muschi",
  },
  {
    terms: ["biceps femoris", "semitendinosus", "semimembranosus", "hamstring", "ischiogambieri"],
    common_name_ro: "Mușchiul coapsei din spate",
    scientific_name_ro: "ischiogambieri",
    tissue: "muschi",
  },
  {
    terms: ["pectoralis major", "pectoral mare"],
    common_name_ro: "Mușchiul pieptului",
    scientific_name_ro: "pectoral mare",
    tissue: "muschi",
  },
  {
    terms: ["latissimus dorsi", "marele dorsal"],
    common_name_ro: "Mușchiul spatelui lateral",
    scientific_name_ro: "marele dorsal",
    tissue: "muschi",
  },
  {
    terms: ["sternocleidomastoid", "sternocleidomastoidian"],
    common_name_ro: "Mușchiul gâtului lateral",
    scientific_name_ro: "sternocleidomastoidian",
    tissue: "muschi",
  },
  {
    terms: ["pronator teres", "pronator rotund"],
    common_name_ro: "Mușchi pentru rotirea antebrațului",
    scientific_name_ro: "pronator rotund",
    tissue: "muschi",
  },
  {
    terms: ["pronator quadratus", "pronator patrat"],
    common_name_ro: "Mușchi profund pentru rotirea antebrațului",
    scientific_name_ro: "pronator pătrat",
    tissue: "muschi",
  },
  {
    terms: ["supinator"],
    common_name_ro: "Mușchi pentru întoarcerea palmei în sus",
    scientific_name_ro: "supinator",
    tissue: "muschi",
  },
  {
    terms: ["flexor carpi", "flexor digitorum", "palmaris longus"],
    common_name_ro: "Mușchi flexor al antebrațului",
    scientific_name_ro: "flexori ai antebrațului",
    tissue: "muschi",
  },
  {
    terms: ["extensor carpi", "extensor digitorum", "extensor indicis", "extensor digiti"],
    common_name_ro: "Mușchi extensor al antebrațului",
    scientific_name_ro: "extensori ai antebrațului",
    tissue: "muschi",
  },
  {
    terms: ["trapezius", "trapez"],
    common_name_ro: "Mușchiul cefei și spatelui de sus",
    scientific_name_ro: "trapez",
    tissue: "muschi",
  },
  {
    terms: ["teres major", "rotund mare"],
    common_name_ro: "Mușchiul umărului posterior",
    scientific_name_ro: "rotund mare",
    tissue: "muschi",
  },
  {
    terms: ["teres minor", "rotund mic"],
    common_name_ro: "Mușchiul umărului posterior",
    scientific_name_ro: "rotund mic",
    tissue: "muschi",
  },
  {
    terms: ["supraspinatus", "supraspinos"],
    common_name_ro: "Mușchi al umărului de sus",
    scientific_name_ro: "supraspinos",
    tissue: "muschi",
  },
  {
    terms: ["infraspinatus", "infraspinos"],
    common_name_ro: "Mușchi al umărului posterior",
    scientific_name_ro: "infraspinos",
    tissue: "muschi",
  },
  {
    terms: ["subscapularis", "subscapular"],
    common_name_ro: "Mușchi al omoplatului",
    scientific_name_ro: "subscapular",
    tissue: "muschi",
  },
  {
    terms: ["sartorius", "croitor"],
    common_name_ro: "Mușchiul lung al coapsei",
    scientific_name_ro: "sartorius",
    tissue: "muschi",
  },
  {
    terms: ["adductor"],
    common_name_ro: "Mușchiul interior al coapsei",
    scientific_name_ro: "adductori",
    tissue: "muschi",
  },
  {
    terms: ["tibialis anterior", "tibial anterior"],
    common_name_ro: "Mușchiul din fața gambei",
    scientific_name_ro: "tibial anterior",
    tissue: "muschi",
  },
  {
    terms: ["fibularis", "peroneus", "peronier"],
    common_name_ro: "Mușchiul lateral al gambei",
    scientific_name_ro: "peronieri",
    tissue: "muschi",
  },
];

const boneDisplayById: Record<
  string,
  Omit<AnatomyDisplayName, "original_name" | "missing_common_name_ro">
> = {
  humerus: {
    common_name_ro: "Osul brațului",
    scientific_name_ro: "humerus",
    latin_name: "Humerus",
    display_name: "Osul brațului (humerus)",
    title: "Osul brațului",
    subtitle: "Humerus",
  },
  femur: {
    common_name_ro: "Osul coapsei",
    scientific_name_ro: "femur",
    latin_name: "Femur",
    display_name: "Osul coapsei (femur)",
    title: "Osul coapsei",
    subtitle: "Femur",
  },
  scapula: {
    common_name_ro: "Omoplatul",
    scientific_name_ro: "scapula",
    latin_name: "Scapula",
    display_name: "Omoplatul (scapula)",
    title: "Omoplatul",
    subtitle: "Scapula",
  },
  rotula: {
    common_name_ro: "Rotula",
    scientific_name_ro: "patela",
    latin_name: "Patella",
    display_name: "Rotula (patela)",
    title: "Rotula",
    subtitle: "Patela",
  },
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ș/g, "s")
    .replace(/ț/g, "t");
}

function stripTechnicalPrefix(value: string) {
  return value
    .replace(/^capul\s+(superficial|profund)\s+al\s+mușchiului\s+/i, "")
    .replace(/^capul\s+(superficial|profund)\s+al\s+muschiului\s+/i, "")
    .replace(/^mușchiul\s+/i, "")
    .replace(/^muschiul\s+/i, "")
    .replace(/^mușchi\s+/i, "")
    .replace(/^muschi\s+/i, "")
    .trim();
}

function formatDisplay(commonName: string, scientificName: string) {
  const scientific = stripTechnicalPrefix(scientificName);
  return `${commonName} (${scientific.toLowerCase()})`;
}

function matchesRule(rule: DisplayRule, haystack: string, tissue: TissueType) {
  if (rule.tissue && rule.tissue !== tissue) return false;
  return rule.terms.some((term) => haystack.includes(normalize(term)));
}

export function getAnatomyDisplayName(input: {
  bone?: Bone | null;
  selection: BoneSelection;
}): AnatomyDisplayName {
  const { bone, selection } = input;
  const originalName =
    bone?.name ?? selection.label ?? selection.regionLabel ?? "Structură anatomică";

  if (bone) {
    const mapped = boneDisplayById[bone.id];
    if (mapped) {
      return {
        ...mapped,
        original_name: originalName,
        missing_common_name_ro: false,
      };
    }

    return {
      original_name: originalName,
      scientific_name_ro: bone.name,
      latin_name: bone.latin,
      display_name: bone.name,
      title: bone.name,
      subtitle: bone.latin,
      missing_common_name_ro: true,
    };
  }

  const haystack = normalize(
    [selection.labelEn, selection.label, selection.regionLabel, selection.id]
      .filter(Boolean)
      .join(" "),
  );
  const rule = muscleDisplayRules.find((candidate) =>
    matchesRule(candidate, haystack, selection.tissue),
  );

  if (rule) {
    return {
      common_name_ro: rule.common_name_ro,
      scientific_name_ro: rule.scientific_name_ro,
      original_name: originalName,
      display_name: formatDisplay(rule.common_name_ro, rule.scientific_name_ro),
      title: rule.common_name_ro,
      subtitle: stripTechnicalPrefix(rule.scientific_name_ro),
      missing_common_name_ro: false,
    };
  }

  const fallbackScientific = stripTechnicalPrefix(originalName);
  return {
    original_name: originalName,
    scientific_name_ro: fallbackScientific,
    display_name: originalName,
    title: originalName,
    subtitle:
      selection.labelEn && selection.labelEn !== originalName ? selection.labelEn : undefined,
    missing_common_name_ro: true,
  };
}
