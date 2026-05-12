import { normalizeSantixMessage } from "./normalizer";
import type {
  Duration,
  ExtractedSignals,
  NormalizedMessage,
  Onset,
  PainQuality,
  Severity,
  TraumaType,
  YesNoUnknown,
} from "./types";

const BODY_REGION_TERMS: Array<[string, string[]]> = [
  ["humerus", ["humerus", "brat", "bratul"]],
  ["genunchi", ["genunchi", "rotula", "patela"]],
  ["mana", ["mana", "palma", "deget", "degete", "pumn", "incheietura"]],
  ["umar", ["umar", "scapula", "omoplat", "clavicula"]],
  ["spate", ["spate", "coloana", "lombar", "cervical", "ceafa"]],
  ["glezna", ["glezna", "tars"]],
  ["sold", ["sold", "bazin"]],
  ["torace", ["torace", "piept", "stern", "coaste"]],
  ["gamba", ["gamba", "gambă"]],
  ["biceps", ["biceps"]],
  ["antebrat", ["antebrat", "brahioradial", "pronator"]],
];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function detectAffirmation(text: string): YesNoUnknown {
  if (/\b(da|sigur|normal|pot|merge|cred ca da)\b/.test(text)) return "yes";
  return "unknown";
}

function detectNegation(text: string): YesNoUnknown {
  if (/\b(nu|deloc|niciuna|niciun|nicio|fara)\b/.test(text)) return "no";
  return "unknown";
}

function detectSeverity(text: string): Severity {
  if (includesAny(text, ["insuportabil", "nu suport", "foarte rau", "foarte tare", "tare", "sever", "durere mare"])) {
    return "severe";
  }
  if (includesAny(text, ["moderat", "moderata", "mediu", "destul"])) return "moderate";
  if (includesAny(text, ["usor", "usoara", "putin", "suportabil", "slab"])) return "mild";
  return "unknown";
}

function detectPainQuality(text: string): PainQuality {
  if (includesAny(text, ["intepatoare", "inteapa", "intepatura", "intepaturi", "junghi"])) return "stabbing";
  if (includesAny(text, ["arsura", "arde", "arzatoare", "ustura"])) return "burning";
  if (includesAny(text, ["pulseaza", "pulsatila", "zvacneste"])) return "throbbing";
  if (includesAny(text, ["surda", "apasatoare", "disconfort"])) return "dull";
  if (includesAny(text, ["ascutita", "taioasa"])) return "sharp";
  if (includesAny(text, ["presiune", "apasa"])) return "pressure";
  if (includesAny(text, ["trage", "tragere", "intinde"])) return "pulling";
  if (includesAny(text, ["crampa", "crampe", "carcel", "spasm"])) return "cramp";
  return "unknown";
}

function detectMovement(text: string): YesNoUnknown {
  if (
    includesAny(text, [
      "nu pot misca",
      "nu se misca",
      "nu pot calca",
      "nu pot merge",
      "nu pot sprijini",
      "blocat",
      "deloc",
    ])
  ) {
    return "no";
  }
  if (includesAny(text, ["pot misca normal", "pot misca norma", "se misca normal", "pot misca"]) || text === "pot") {
    return "yes";
  }
  return "unknown";
}

function detectTraumaType(text: string): TraumaType {
  if (includesAny(text, ["dupa niciuna", "niciuna din", "fara lovitura", "fara efort"])) return "none";
  if (includesAny(text, ["cazatura", "cazut", "cadere"])) return "fall";
  if (includesAny(text, ["lovitura", "lovit", "izbit"])) return "hit";
  if (includesAny(text, ["fotbal", "sport", "alergare", "alerg", "alergat"])) return "sport";
  if (includesAny(text, ["sala", "efort", "ridicat greutati", "incordare", "incordez", "incordat"])) return "effort";
  if (includesAny(text, ["accident"])) return "accident";
  return "unknown";
}

function detectOnset(text: string): Onset {
  if (includesAny(text, ["brusc", "dintr o data", "deodata"])) return "sudden";
  if (includesAny(text, ["treptat", "incet"])) return "gradual";
  return "unknown";
}

function detectDuration(text: string): Duration {
  if (includesAny(text, ["minute", "minutele"])) return "minutes";
  if (includesAny(text, ["ore", "cateva ore"])) return "hours";
  if (includesAny(text, ["de azi", "de ieri", "o zi", "cateva zile", "zile"])) return "days";
  if (includesAny(text, ["saptamana", "o saptamana"])) return "week_plus";
  if (includesAny(text, ["de mult", "luni", "cronic"])) return "chronic";
  return "unknown";
}

function detectBodyRegion(text: string) {
  return BODY_REGION_TERMS.find(([, terms]) => includesAny(text, terms))?.[0] ?? null;
}

function yesIf(text: string, terms: string[]): YesNoUnknown {
  return includesAny(text, terms) ? "yes" : "unknown";
}

export function extractSignals(
  input: string | NormalizedMessage,
  options: { lastQuestionIntent?: string | null } = {},
): ExtractedSignals {
  const normalized = typeof input === "string" ? normalizeSantixMessage(input) : input;
  const text = normalized.matchMessage;
  const traumaType = detectTraumaType(text);
  const contexts = [
    traumaType !== "unknown" && traumaType !== "none" ? traumaType : "",
    includesAny(text, ["sala", "efort", "incordare", "incordez", "incordat", "ridicat greutati"]) ? "effort" : "",
    includesAny(text, ["crampa", "crampe", "carcel", "spasm"]) ? "cramp" : "",
  ].filter(Boolean);
  const swelling = yesIf(text, ["umflat", "umflatura"]);
  const bruising = yesIf(text, ["vanataie", "invinetit"]);
  const numbness = yesIf(text, ["amorteala", "amorteste", "pierdere sensibilitate"]);
  const weakness = yesIf(text, ["slabiciune"]);
  const deformity = yesIf(text, ["deformare", "deformat"]);
  const movement = detectMovement(text);
  const negation = detectNegation(text);
  const painQuality = detectPainQuality(text);
  const severity = detectSeverity(text);
  const painPresent = includesAny(text, [
    "ma doare",
    "ma dor",
    "durere",
    "doare",
    "ma tine",
    "tine",
    "ma inteapa",
    "intepatura",
    "arde",
    "trage",
    "febra musculara",
    "crampa",
    "crampe",
  ])
    ? "yes"
    : painQuality !== "unknown"
      ? "yes"
      : "unknown";

  const redFlagReasons = [
    movement === "no" ? "imposibilitate de mișcare" : "",
    numbness === "yes" ? "amorțeală" : "",
    weakness === "yes" ? "slăbiciune" : "",
    deformity === "yes" ? "deformare" : "",
    severity === "severe" ? "durere severă" : "",
  ].filter(Boolean);

  const associatedNo = options.lastQuestionIntent === "associated_signs" && negation === "no";

  return {
    affirmation: detectAffirmation(text),
    negation,
    pain_present: painPresent,
    pain_quality: painQuality,
    severity,
    movement_ok: movement,
    trauma_or_effort: traumaType === "none" ? "no" : traumaType !== "unknown" ? "yes" : "unknown",
    trauma_type: traumaType,
    onset: detectOnset(text),
    duration: detectDuration(text),
    swelling: associatedNo ? "no" : swelling,
    bruising: associatedNo ? "no" : bruising,
    numbness: associatedNo ? "no" : numbness,
    weakness,
    deformity,
    contexts,
    body_region: detectBodyRegion(text),
    structure_slug: null,
    red_flags_detected: redFlagReasons.length > 0,
    red_flag_reasons: redFlagReasons,
    unclear: normalized.tokens.length === 0,
  };
}
