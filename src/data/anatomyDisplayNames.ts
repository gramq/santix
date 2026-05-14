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
  missing_ro_display_name: boolean;
  source: "db" | "fallback";
}

export interface AnatomyNameRecord {
  slug?: string | null;
  name_ro?: string | null;
  name?: string | null;
  romanian_name?: string | null;
  common_name_ro?: string | null;
  scientific_name_ro?: string | null;
  display_name_ro?: string | null;
  subtitle_name?: string | null;
  english_name?: string | null;
  name_latin?: string | null;
  latin_name?: string | null;
  missing_ro_display_name?: boolean | null;
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
    common_name_ro: "Mușchiul lateral al antebrațului",
    scientific_name_ro: "Brahioradial",
    tissue: "muschi",
  },
  {
    terms: ["biceps brachii", "biceps brahial"],
    common_name_ro: "Mușchiul biceps al brațului",
    scientific_name_ro: "Biceps brahial",
    tissue: "muschi",
  },
  {
    terms: ["triceps brachii", "triceps brahial"],
    common_name_ro: "Mușchiul triceps al brațului",
    scientific_name_ro: "Triceps brahial",
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
    common_name_ro: "Mușchii flexori ai antebrațului",
    scientific_name_ro: "Flexorii antebrațului",
    tissue: "muschi",
  },
  {
    terms: ["extensor carpi", "extensor digitorum", "extensor indicis", "extensor digiti"],
    common_name_ro: "Mușchii extensori ai antebrațului",
    scientific_name_ro: "Extensorii antebrațului",
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
  Omit<AnatomyDisplayName, "original_name" | "missing_ro_display_name" | "source">
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
  return `${commonName} (${scientific})`;
}

function matchesRule(rule: DisplayRule, haystack: string, tissue: TissueType) {
  if (rule.tissue && rule.tissue !== tissue) return false;
  return rule.terms.some((term) => haystack.includes(normalize(term)));
}

export function getAnatomyDisplayName(input: {
  bone?: Bone | null;
  selection: BoneSelection;
  dbStructure?: AnatomyNameRecord | null;
}): AnatomyDisplayName {
  const { bone, selection, dbStructure } = input;
  const originalName =
    bone?.name ?? selection.label ?? selection.regionLabel ?? "Structură anatomică";

  const dbDisplay = getDbDisplayName(dbStructure, originalName);
  if (dbDisplay) return dbDisplay;

  if (bone) {
    const mapped = boneDisplayById[bone.id];
    if (mapped) {
      return {
        ...mapped,
        original_name: originalName,
        missing_ro_display_name: false,
        source: "fallback",
      };
    }

    return {
      original_name: originalName,
      scientific_name_ro: bone.name,
      latin_name: bone.latin,
      display_name: bone.name,
      title: bone.name,
      subtitle: bone.latin,
      missing_ro_display_name: true,
      source: "fallback",
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
  const phalanx = inferHandPhalanxDisplay(haystack);

  if (phalanx) {
    return {
      common_name_ro: phalanx,
      scientific_name_ro: originalName,
      original_name: originalName,
      display_name: phalanx,
      title: phalanx,
      subtitle: selection.labelEn ?? originalName,
      missing_ro_display_name: false,
      source: "fallback",
    };
  }

  if (rule) {
    return {
      common_name_ro: rule.common_name_ro,
      scientific_name_ro: rule.scientific_name_ro,
      original_name: originalName,
      display_name: formatDisplay(rule.common_name_ro, rule.scientific_name_ro),
      title: rule.common_name_ro,
      subtitle: stripTechnicalPrefix(rule.scientific_name_ro),
      missing_ro_display_name: false,
      source: "fallback",
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
    missing_ro_display_name: true,
    source: "fallback",
  };
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
}

function getDbDisplayName(
  structure: AnatomyNameRecord | null | undefined,
  originalName: string,
): AnatomyDisplayName | null {
  if (!structure) return null;

  const romanianName = firstText(
    structure.romanian_name,
    structure.name_ro,
    isLikelyRomanian(structure.name) ? structure.name : null,
  );
  const displayName = firstText(structure.display_name_ro);
  const commonName = firstText(structure.common_name_ro);
  const scientificName = firstText(structure.scientific_name_ro);
  const fallbackName = firstText(romanianName, structure.name, structure.english_name, originalName);
  const subtitle = firstText(
    structure.subtitle_name,
    scientificName && scientificName !== displayName && scientificName !== commonName
      ? scientificName
      : null,
    structure.latin_name,
    structure.name_latin,
    structure.english_name,
  );

  if (displayName) {
    return {
      common_name_ro: commonName,
      scientific_name_ro: scientificName,
      latin_name: firstText(structure.latin_name, structure.name_latin),
      original_name: originalName,
      display_name: displayName,
      title: displayName,
      subtitle,
      missing_ro_display_name: Boolean(structure.missing_ro_display_name),
      source: "db",
    };
  }

  if (commonName && scientificName) {
    return {
      common_name_ro: commonName,
      scientific_name_ro: scientificName,
      latin_name: firstText(structure.latin_name, structure.name_latin),
      original_name: originalName,
      display_name: commonName,
      title: commonName,
      subtitle: firstText(structure.subtitle_name, scientificName),
      missing_ro_display_name: Boolean(structure.missing_ro_display_name),
      source: "db",
    };
  }

  if (commonName) {
    return {
      common_name_ro: commonName,
      scientific_name_ro: scientificName,
      latin_name: firstText(structure.latin_name, structure.name_latin),
      original_name: originalName,
      display_name: commonName,
      title: commonName,
      subtitle,
      missing_ro_display_name: Boolean(structure.missing_ro_display_name),
      source: "db",
    };
  }

  if (romanianName) {
    return {
      common_name_ro: commonName,
      scientific_name_ro: scientificName,
      latin_name: firstText(structure.latin_name, structure.name_latin),
      original_name: originalName,
      display_name: romanianName,
      title: romanianName,
      subtitle,
      missing_ro_display_name: Boolean(structure.missing_ro_display_name),
      source: "db",
    };
  }

  if (!fallbackName) return null;

  return {
    common_name_ro: commonName,
    scientific_name_ro: scientificName,
    latin_name: firstText(structure.latin_name, structure.name_latin),
    original_name: originalName,
    display_name: fallbackName,
    title: fallbackName,
    subtitle,
    missing_ro_display_name: true,
    source: "db",
  };
}

function isLikelyRomanian(value: string | null | undefined) {
  if (!value) return false;
  return /[ăâîșțĂÂÎȘȚ]/.test(value) || /\b(os|oase|mușchi|muschi|falanga|rotula)\b/i.test(value);
}

function inferHandPhalanxDisplay(haystack: string) {
  if (!haystack.includes("phalanx")) return null;
  if (!hasAnyNormalized(haystack, ["finger", "thumb", "hand"])) return null;

  const segment = haystack.includes("proximal")
    ? "proximală"
    : haystack.includes("middle")
      ? "mijlocie"
      : haystack.includes("distal")
        ? "distală"
        : null;
  if (!segment) return null;

  const finger = hasAnyNormalized(haystack, ["thumb"])
    ? "policelui"
    : hasAnyNormalized(haystack, ["index", "second"])
      ? "degetului arătător"
      : hasAnyNormalized(haystack, ["middle finger", "third"])
        ? "degetului mijlociu"
        : hasAnyNormalized(haystack, ["fourth", "ring"])
          ? "degetului inelar"
          : hasAnyNormalized(haystack, ["little", "fifth"])
            ? "degetului mic"
            : null;
  if (!finger) return null;

  return `Falanga ${segment} a ${finger}`;
}

function hasAnyNormalized(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(normalize(term)));
}
