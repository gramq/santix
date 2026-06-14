import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { normalizeMedicalText as normalizeSantixMedicalText } from "./ai/normalizer";
import { createAiProvider } from "./ai/provider";
import { hybridSearchKnowledge, type KnowledgeEntry, type RetrievalFilters } from "./ai/retrieval";
import { mergePersistedStateIntoLegacy, toPersistableState } from "./ai/state";
import { buildStructuredAiOutput, type SantixStructuredAiOutput } from "./ai/structured-output";
import { validateAiUserText, sanitizeTextForStorage } from "./security/inputSafety";
import { assertRateLimitAllowed, enforceAiRateLimit } from "./security/rateLimit";

const TissueSchema = z.enum(["os", "muschi", "tendon", "organ"]);

const InputSchema = z.object({
  accessToken: z.string().min(10),
  question: z.string().min(2).max(900),
  tissue: TissueSchema,
  structureName: z.string().min(1).max(160),
  structureSlug: z.string().min(1).max(160).optional(),
  modelSelectionId: z.string().min(1).max(160).optional(),
  bodyRegion: z.string().min(1).max(160).optional(),
  visualLayer: z.enum(["skeleton", "muscular", "organs", "complete"]).optional(),
  aiLayer: z.enum(["skeleton", "muscular", "organs"]).optional(),
  conversationId: z.string().uuid().optional(),
  lang: z.enum(["ro", "en"]).optional().default("ro"),
});

type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content_ro: string;
};

type SelectionScope = {
  structureSlug: string | null;
  modelSelectionId: string | null;
  bodyRegion: string | null;
};

type AiMode = "3D_SELECTION_MODE" | "GENERAL_MEDICAL_MODE";

type TargetLayer = "skeleton" | "muscular" | "organs";

type SelectedContextFit =
  | "correct_context"
  | "likely_muscular_but_bone_selected"
  | "likely_bone_joint_but_muscle_selected"
  | "likely_organ_but_other_selected"
  | "different_body_region_detected"
  | "unclear_need_more_questions"
  | "red_flag_priority"
  | "out_of_scope";

type ContextSwitchConfidence = "low" | "medium" | "high";

type QuestionCategory =
  | "selection_specific"
  | "medical_general"
  | "symptom_or_injury"
  | "red_flag_or_urgent"
  | "out_of_scope"
  | "app_specific"
  | "unclear_message";

type ExtractedEntities = {
  bodyRegion: string | null;
  bodyRegionLabel: string | null;
  bodyRegionKey: string | null;
  symptoms: string[];
  contexts: string[];
  duration: string | null;
  severity: string | null;
  redFlags: string[];
  keywords: string[];
};

type AiRoute = {
  category: QuestionCategory;
  mode: AiMode | null;
  entities: ExtractedEntities;
  reason: string;
  selectedSubjectMentioned: boolean;
  selectedRegionKey: string | null;
  selectionConflict: boolean;
  conflictNote: string | null;
  targetStructureSlug: string | null;
  targetStructureType: string | null;
  targetBodyRegion: string | null;
  shouldUpdate3dSelection: boolean;
};

type ContextSwitchAction = {
  selected_context_fit: SelectedContextFit;
  should_switch_context: boolean;
  target_layer: TargetLayer | null;
  target_structure_slug: string | null;
  target_structure_type: "bone" | "muscle" | "body_region" | "muscle_group" | "organ" | null;
  target_body_region: string | null;
  switch_reason: string | null;
  confidence: ContextSwitchConfidence;
  switch_locked_until_clarification: boolean;
};

export type AiContextSwitchAction = ContextSwitchAction;

type SymptomStateValue = "yes" | "no" | "unknown";
type PainQuality =
  | "unknown"
  | "stabbing"
  | "burning"
  | "throbbing"
  | "dull"
  | "sharp"
  | "pressure"
  | "pulling"
  | "cramp";
type SymptomNextStep =
  | "ask_trauma_or_effort"
  | "ask_onset"
  | "ask_movement"
  | "ask_severity"
  | "ask_associated_signs"
  | "ask_duration"
  | "recommend"
  | "urgent";

type SymptomState = {
  selected_structure: string;
  selected_structure_type: string;
  selected_region: string | null;
  selected_body_region: string | null;
  visual_layer: "skeleton" | "muscular" | "organs" | "complete";
  ai_layer: TargetLayer;
  current_topic: "anatomy" | "pain" | "injury" | "symptom" | "out_of_scope";
  pain_present: boolean;
  pain_quality: PainQuality;
  trauma_or_effort: SymptomStateValue;
  trauma_type: "fall" | "hit" | "sport" | "effort" | "none" | "unknown";
  onset: "sudden" | "gradual" | "unknown";
  movement_ok: SymptomStateValue;
  swelling: SymptomStateValue;
  bruising: SymptomStateValue;
  numbness: SymptomStateValue;
  weakness: SymptomStateValue;
  deformity: SymptomStateValue;
  severity: "mild" | "moderate" | "severe" | "unknown";
  duration: "minutes" | "hours" | "days" | "week_plus" | "chronic" | "unknown";
  red_flags_detected: boolean;
  red_flag_reasons: string[];
  asked_questions: string[];
  answered_fields: string[];
  last_question_intent: string | null;
  next_step: SymptomNextStep;
  should_switch_context: boolean;
  target_layer: TargetLayer | null;
  target_structure_slug: string | null;
  target_body_region: string | null;
  confidence: ContextSwitchConfidence;
  last_context_switch: string | null;
  switch_count: number;
  switch_locked_until_clarification: boolean;
  asked: {
    trauma_or_effort: boolean;
    movement_ok: boolean;
    swelling_or_numbness: boolean;
    severity: boolean;
    duration: boolean;
    onset: boolean;
  };
};

export interface SelectionAiResponse {
  conversationId: string;
  answer: string;
  contextCount: number;
  structured: SantixStructuredAiOutput;
  route?: {
    category: QuestionCategory;
    mode: AiMode | null;
    selectedSubjectMentioned: boolean;
    selectionConflict: boolean;
    target_structure_slug: string | null;
    target_structure_type: string | null;
    target_body_region: string | null;
    should_update_3d_selection: boolean;
  };
  contextSwitch?: ContextSwitchAction;
}

function createUserSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Lipsește configurarea Supabase pentru funcția AI.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function findContext(context: KnowledgeEntry[], category: string) {
  return context.find((entry) => entry.category === category)?.content_ro;
}

function hasAny(value: string, terms: string[]) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return terms.some((term) => normalized.includes(term));
}

function normalizeForScope(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildConversationTitle(input: z.infer<typeof InputSchema>, route: AiRoute) {
  const target = (route.entities.bodyRegionLabel ?? input.structureName)
    .replace(/\s+/g, " ")
    .trim();
  const normalizedQuestion = normalizeText(input.question);

  if (
    route.category === "symptom_or_injury" ||
    route.category === "red_flag_or_urgent" ||
    hasAny(normalizedQuestion, ["durere", "doare", "dureri", "lovitura", "lovit", "efort"])
  ) {
    return `Durere — ${target}`;
  }

  if (
    route.category === "selection_specific" ||
    hasAny(normalizedQuestion, [
      "rol",
      "functie",
      "functia",
      "anatomie",
      "misca",
      "miscare",
      "unde este",
    ])
  ) {
    return `Anatomie — ${target}`;
  }

  return `Conversație — ${target}`;
}

const COLLOQUIAL_ADDRESS_TERMS = [
  "frate",
  "bro",
  "boss",
  "vere",
  "man",
  "sefu",
  "unchiule",
  "coaie",
  "coae",
  "coaje",
  "ba",
];

function normalizeColloquialAddressing(value: string | undefined) {
  let text = normalizeText(value).replace(/[?.!,;:"'()[\]{}]/g, " ");
  text = text.replace(new RegExp(`\\b(${COLLOQUIAL_ADDRESS_TERMS.join("|")})\\b`, "g"), " ");
  text = text.replace(/\bma\b(?!\s+(doare|dor|durea|lovit|cazut|impiedicat))/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeMedicalText(value: string | undefined) {
  return normalizeSantixMedicalText(value);
}

function stripPunctuation(value: string) {
  return normalizeColloquialAddressing(value)
    .replace(/[?.!,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInputForAi<T extends z.infer<typeof InputSchema>>(input: T): T {
  const question = normalizeColloquialAddressing(input.question);
  return {
    ...input,
    question: question.length >= 2 ? question : input.question.trim(),
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

const BODY_REGION_TERMS: Array<{
  key: string;
  label: string;
  terms: string[];
  bodyRegions: string[];
  targetStructureSlug: string | null;
  targetStructureType: string | null;
}> = [
  {
    key: "mana",
    label: "mână / încheietură",
    terms: [
      "mana",
      "mainii",
      "palma",
      "deget",
      "degete",
      "incheietura",
      "pumn",
      "carp",
      "metacarp",
      "hand",
      "wrist",
      "finger",
      "fingers",
      "thumb",
      "palm",
      "knuckle",
    ],
    bodyRegions: ["mana", "mana_antebrat", "antebrat"],
    targetStructureSlug: "carp",
    targetStructureType: "os",
  },
  {
    key: "cot",
    label: "cot",
    terms: ["cot", "cotul", "olecran", "elbow"],
    bodyRegions: ["antebrat", "brat"],
    targetStructureSlug: null,
    targetStructureType: null,
  },
  {
    key: "umar",
    label: "umăr",
    terms: ["umar", "umarul", "scapula", "clavicula", "omoplat", "deltoid", "shoulder", "shoulder blade", "collarbone"],
    bodyRegions: ["umar_centura_scapulara", "membru_superior"],
    targetStructureSlug: "scapula",
    targetStructureType: "os",
  },
  {
    key: "brat",
    label: "braț",
    terms: ["brat", "bratul", "antebrat", "humerus", "radius", "ulna", "biceps", "triceps", "arm", "upper arm", "forearm", "upper limb"],
    bodyRegions: ["brat", "antebrat", "membru_superior", "mana_antebrat"],
    targetStructureSlug: "humerus",
    targetStructureType: "os",
  },
  {
    key: "spate",
    label: "spate / coloană",
    terms: ["spate", "coloana", "lombar", "cervical", "toracal", "vertebr", "ceafa", "back", "spine", "lumbar", "thoracic", "vertebra", "vertebrae", "spinal"],
    bodyRegions: ["coloana", "trunchi", "cap_gat"],
    targetStructureSlug: "vert-lombare",
    targetStructureType: "os",
  },
  {
    key: "gat",
    label: "gât",
    terms: ["gat", "ceafa", "cervical", "neck"],
    bodyRegions: ["gat", "cap_gat", "coloana"],
    targetStructureSlug: "vert-cervicale",
    targetStructureType: "os",
  },
  {
    key: "genunchi",
    label: "genunchi",
    terms: ["genunchi", "rotula", "patela", "knee", "kneecap"],
    bodyRegions: ["coapsa_sold_genunchi", "membru_inferior"],
    targetStructureSlug: "rotula",
    targetStructureType: "os",
  },
  {
    key: "glezna",
    label: "gleznă",
    terms: ["glezna", "glezne", "maleola", "ankle"],
    bodyRegions: ["picior", "gamba", "membru_inferior"],
    targetStructureSlug: "tars",
    targetStructureType: "os",
  },
  {
    key: "sold",
    label: "șold / bazin",
    terms: ["sold", "bazin", "pelvis", "coxal", "inghinal", "hip", "groin", "pelvic"],
    bodyRegions: ["pelvis", "membru_inferior"],
    targetStructureSlug: "coxal",
    targetStructureType: "os",
  },
  {
    key: "picior",
    label: "picior / talpă",
    terms: [
      "picior",
      "talpa",
      "calcai",
      "degetele de la picior",
      "tars",
      "metatars",
      "gamba",
      "coapsa",
      "foot",
      "feet",
      "heel",
      "toe",
      "toes",
      "calf",
      "thigh",
      "leg",
      "shin",
      "fibula",
      "tibia",
      "femur",
      "lower leg",
      "lower limb",
    ],
    bodyRegions: ["picior", "gamba", "coapsa_sold_genunchi", "membru_inferior"],
    targetStructureSlug: "tars",
    targetStructureType: "os",
  },
  {
    key: "torace",
    label: "torace / piept",
    terms: ["torace", "piept", "pectoral", "coaste", "stern", "respiratie", "chest", "thorax", "rib", "ribs", "sternum", "breathing"],
    bodyRegions: ["torace", "trunchi"],
    targetStructureSlug: "coaste",
    targetStructureType: "os",
  },
  {
    key: "abdomen",
    label: "abdomen / burtă",
    terms: ["abdomen", "abdominal", "burta", "burtă", "stomac", "buric", "iliac", "belly", "stomach area", "abdominal"],
    bodyRegions: ["abdomen", "trunchi"],
    targetStructureSlug: "coxal",
    targetStructureType: "os",
  },
  {
    key: "cap",
    label: "cap / față",
    terms: ["cap", "craniu", "fata", "frunte", "mandibula", "ochi", "tampla", "head", "skull", "face", "jaw", "forehead", "cheek", "temple"],
    bodyRegions: ["cap_craniu", "fata", "cap_gat"],
    targetStructureSlug: "frontal",
    targetStructureType: "os",
  },
];

const SYMPTOM_TERMS: Array<{ key: string; terms: string[] }> = [
  { key: "durere", terms: ["durere", "ma doare", "doare", "dureros", "jena"] },
  { key: "umflare", terms: ["umflat", "umflare", "inflamat", "edem"] },
  {
    key: "amorțeală",
    terms: ["amorteala", "amortit", "furnicaturi", "nu simt", "pierderea sensibilitatii"],
  },
  { key: "vânătaie", terms: ["vanataie", "vanat", "echimoza"] },
  { key: "slăbiciune", terms: ["slabiciune", "pierdere de forta", "nu am forta"] },
  { key: "rigiditate", terms: ["rigid", "intepenit", "intepeneala", "blocaj", "blocat"] },
  {
    key: "limitare de mișcare",
    terms: [
      "nu pot misca",
      "limitare",
      "nu pot folosi",
      "nu pot ridica",
      "nu pot calca",
      "nu pot sprijini",
    ],
  },
];

const CONTEXT_TERMS: Array<{ key: string; terms: string[] }> = [
  { key: "căzătură", terms: ["cazut", "cadere", "am cazut", "m-am impiedicat"] },
  { key: "sport", terms: ["sport", "fotbal", "baschet", "tenis", "antrenament", "meci"] },
  { key: "alergare", terms: ["alerg", "alergare", "jogging"] },
  { key: "ridicat greutăți", terms: ["ridicat greutati", "sala", "gantere", "impins", "tras"] },
  { key: "lovitură", terms: ["lovitura", "impact", "m-am lovit", "trauma", "traumatism"] },
  { key: "efort repetitiv", terms: ["efort", "suprasolicitare", "repetitiv", "tastat", "scris"] },
  { key: "postură", terms: ["postura", "scaun", "stat mult", "birou", "somn"] },
];

const RED_FLAG_TERMS: Array<{ key: string; terms: string[] }> = [
  { key: "deformare vizibilă", terms: ["deform", "stramb", "os iesit"] },
  { key: "durere severă", terms: ["durere severa", "insuportabil", "foarte tare", "nu suport"] },
  { key: "amorțeală", terms: ["amorteala", "amortit", "nu simt", "pierderea sensibilitatii"] },
  {
    key: "imposibilitate de mișcare",
    terms: ["nu pot misca", "nu pot folosi", "nu pot ridica", "nu pot indoi"],
  },
  {
    key: "imposibilitate de sprijin",
    terms: ["nu pot calca", "nu pot sprijini", "nu pot merge", "nu pot pune greutate"],
  },
  { key: "slăbiciune bruscă", terms: ["slabiciune brusca", "nu am forta", "pierdere de forta"] },
  {
    key: "dificultăți de respirație",
    terms: ["dificultate de respiratie", "dificultati de respiratie", "nu pot respira", "respir greu"],
  },
  { key: "durere toracică", terms: ["durere toracica", "durere in piept", "ma doare pieptul"] },
  { key: "febră mare", terms: ["febra mare", "febra"] },
  {
    key: "durere abdominală severă",
    terms: ["durere abdominala severa", "abdomen foarte dureros", "burta foarte tare", "abdomen rigid"],
  },
  {
    key: "sânge în urină/scaun/vărsături",
    terms: [
      "sange in urina",
      "sange in scaun",
      "scaun cu sange",
      "urina cu sange",
      "varsaturi cu sange",
      "vomit sange",
    ],
  },
  {
    key: "leșin sau confuzie",
    terms: ["lesin", "am lesinat", "confuz", "confuzie", "ameteli puternice", "foarte slabit"],
  },
  {
    key: "durere puternică în partea dreaptă jos",
    terms: ["dreapta jos", "partea dreapta jos", "durere dreapta jos"],
  },
  {
    key: "simptome neurologice bruște",
    terms: ["nu pot vorbi", "fata cazuta", "paralizie brusca", "slabiciune pe o parte"],
  },
  {
    key: "control urinar/fecal afectat",
    terms: ["urina", "scaun", "control urinar", "control fecal", "incontinenta"],
  },
  {
    key: "traumatism puternic",
    terms: ["accident", "traumatism puternic", "impact puternic", "cazut de la inaltime"],
  },
];

const OUT_OF_SCOPE_TERMS = [
  "alegeri",
  "politica",
  "investitii",
  "bursa",
  "crypto",
  "bitcoin",
  "programare",
  "cod",
  "magazin online",
  "reteta",
  "gluma",
  "film",
  "muzica",
  "istorie",
  "joc",
];

const APP_SPECIFIC_TERMS = [
  "santix",
  "aplicatia",
  "aplicatie",
  "abonament",
  "pret",
  "preturi",
  "servicii",
  "functii",
  "cont",
  "login",
  "baza de date",
];

const SELECTION_TERMS = [
  "ce este",
  "ce rol",
  "rol are",
  "functie",
  "functia",
  "anatomie",
  "structura",
  "osul",
  "muschiul",
  "muschi",
  "organ",
  "organe",
  "rinichi",
  "stomac",
  "inima",
  "plamani",
  "ficat",
  "pancreas",
  "vezica",
  "intestin",
  "unde se afla",
  "la ce foloseste",
  "what is",
  "what are",
  "what does",
  "what do",
  "where is",
  "where are",
  "how does",
  "how do",
  "tell me about",
  "explain",
  "describe",
  "bone",
  "muscle",
  "tendon",
  "kidney",
  "stomach",
  "heart",
  "lungs",
  "liver",
  "pancreas",
  "bladder",
  "intestine",
  "role of",
  "function of",
];

const MEDICAL_GENERAL_TERMS = [
  "durere",
  "simptom",
  "recuperare",
  "triaj",
  "medic",
  "urgenta",
  "fractura",
  "entorsa",
  "luxatie",
  "contuzie",
  "tendon",
  "muschi",
  "os",
  "articulatie",
  "organ",
  "organe",
  "rinichi",
  "stomac",
  "inima",
  "plamani",
  "ficat",
  "pancreas",
  "vezica",
  "intestin",
  "pain",
  "injury",
  "fracture",
  "sprain",
  "dislocation",
  "contusion",
  "bruise",
  "symptom",
  "recovery",
  "doctor",
  "emergency",
  "bone",
  "muscle",
  "tendon",
  "joint",
  "ligament",
  "organ",
  "kidney",
  "stomach",
  "heart",
  "lungs",
  "liver",
  "anatomy",
  "anatomical",
];

const PAIN_STARTER_TERMS = [
  "ma doare",
  "ma dor",
  "am durere",
  "doare",
  "dureros",
  "jena",
  "am lovit",
  "m am lovit",
  "m-am lovit",
  "am cazut",
  "m am impiedicat",
  "umflat",
  "umflatura",
  "amorteala",
  "amortit",
  "nu pot misca",
  "nu pot ridica",
  "nu pot folosi",
  "vanataie",
  "vanat",
  "accidentare",
  "accident",
  "it hurts",
  "i have pain",
  "pain in",
  "pain",
  "hurts",
  "hurt",
  "ache",
  "aching",
  "sore",
  "painful",
  "swollen",
  "swelling",
  "numb",
  "numbness",
  "tingling",
  "can't move",
  "cannot move",
  "can't lift",
  "cannot lift",
  "bruised",
  "bruise",
  "i fell",
  "i've fallen",
  "twisted",
  "sprained",
  "injured",
  "injury",
  "stiff",
  "stiffness",
  "tender",
];

const PAIN_QUALITY_TERMS: Array<{ key: Exclude<PainQuality, "unknown">; terms: string[] }> = [
  {
    key: "stabbing",
    terms: [
      "intepatoare",
      "intepator",
      "inteapa",
      "intepaturi",
      "intepatura",
      "junghi",
      "junghiuri",
      "stabbing",
      "stabbing pain",
      "sharp stab",
      "needle",
    ],
  },
  {
    key: "burning",
    terms: [
      "arzatoare",
      "arsura",
      "arde",
      "ustura",
      "usturime",
      "burning",
      "burns",
      "burning sensation",
    ],
  },
  {
    key: "throbbing",
    terms: [
      "pulsatila",
      "pulseaza",
      "zvacneste",
      "zvacnitoare",
      "throbbing",
      "pulsating",
      "pounding",
      "throbbing pain",
    ],
  },
  {
    key: "dull",
    terms: [
      "surda",
      "apasatoare",
      "disconfort",
      "dull ache",
      "dull pain",
      "aching",
    ],
  },
  {
    key: "sharp",
    terms: [
      "ascutita",
      "taioasa",
      "sharp",
      "sharp pain",
      "cutting",
    ],
  },
  {
    key: "pressure",
    terms: [
      "presiune",
      "apasa",
      "apasare",
      "pressure",
      "pressing",
      "heavy feeling",
    ],
  },
  {
    key: "pulling",
    terms: [
      "trage",
      "tragere",
      "intinde",
      "pulling",
      "tugging",
      "stretching pain",
    ],
  },
  {
    key: "cramp",
    terms: [
      "crampa",
      "carcel",
      "spasm",
      "cramp",
      "cramping",
      "muscle cramp",
    ],
  },
];

const ANATOMY_INTENT_TERMS = [
  "ce este",
  "ce rol are",
  "ce rol",
  "unde se afla",
  "cum functioneaza",
  "la ce ajuta",
  "la ce foloseste",
  "explica",
  "functie",
  "functia",
  "what is",
  "what are",
  "what does",
  "where is",
  "where are",
  "how does",
  "explain",
  "describe",
  "function",
  "role of",
  "tell me",
  "what can",
];

function collectMatches(text: string, entries: Array<{ key: string; terms: string[] }>) {
  return entries
    .filter((entry) => entry.terms.some((term) => text.includes(term)))
    .map((entry) => entry.key);
}

function extractQuestionEntities(question: string): ExtractedEntities {
  const text = normalizeColloquialAddressing(question);
  const region = BODY_REGION_TERMS.find((entry) => entry.terms.some((term) => text.includes(term)));
  const symptoms = collectMatches(text, SYMPTOM_TERMS);
  const contexts = collectMatches(text, CONTEXT_TERMS);
  const redFlags = collectMatches(text, RED_FLAG_TERMS);
  const duration = hasAny(text, ["brusc", "dintr-o data"])
    ? "brusc"
    : hasAny(text, ["cateva zile", "de zile", "o saptamana", "saptamani"])
      ? "persistent"
      : hasAny(text, ["cronic", "luni", "de mult"])
        ? "cronic"
        : null;
  const severity = hasAny(text, ["usor", "usoara"])
    ? "ușoară"
    : hasAny(text, ["moderat", "mediu"])
      ? "moderată"
      : hasAny(text, ["sever", "insuportabil", "nu pot"])
        ? "severă / limitantă"
        : null;

  const keywords = unique([
    ...(region?.terms ?? []),
    ...symptoms,
    ...contexts,
    ...redFlags,
    duration ?? "",
    severity ?? "",
  ]).map(normalizeForScope);

  return {
    bodyRegion: region?.bodyRegions[0] ?? null,
    bodyRegionLabel: region?.label ?? null,
    bodyRegionKey: region?.key ?? null,
    symptoms,
    contexts,
    duration,
    severity,
    redFlags,
    keywords,
  };
}

function inferSelectedRegionKey(input: z.infer<typeof InputSchema>) {
  const text = normalizeText(
    [input.structureName, input.structureSlug, input.modelSelectionId, input.bodyRegion]
      .filter(Boolean)
      .join(" "),
  );

  return (
    BODY_REGION_TERMS.find((entry) => entry.terms.some((term) => text.includes(term)))?.key ?? null
  );
}

function areRelatedRegions(a: string | null, b: string | null) {
  if (!a || !b) return true;
  return a === b;
}

function targetForEntities(entities: ExtractedEntities) {
  const region = BODY_REGION_TERMS.find((entry) => entry.key === entities.bodyRegionKey);
  return {
    targetStructureSlug: region?.targetStructureSlug ?? null,
    targetStructureType: region?.targetStructureType ?? null,
    targetBodyRegion: entities.bodyRegion,
  };
}

function hasRecognizableIntent(text: string, entities: ExtractedEntities) {
  return (
    PAIN_STARTER_TERMS.some((term) => text.includes(term)) ||
    PAIN_QUALITY_TERMS.some((entry) => entry.terms.some((term) => text.includes(term))) ||
    ANATOMY_INTENT_TERMS.some((term) => text.includes(term)) ||
    SELECTION_TERMS.some((term) => text.includes(term)) ||
    APP_SPECIFIC_TERMS.some((term) => text.includes(term)) ||
    OUT_OF_SCOPE_TERMS.some((term) => text.includes(term)) ||
    entities.symptoms.length > 0 ||
    entities.contexts.length > 0 ||
    entities.redFlags.length > 0 ||
    Boolean(entities.bodyRegion)
  );
}

const MUSCULAR_CONTEXT_TERMS = [
  "efort",
  "sport",
  "sala",
  "alerg",
  "alergare",
  "intindere",
  "crampa",
  "crampe",
  "febra musculara",
  "incord",
  "incordez",
  "contractie",
  "ridic",
  "imping",
  "trag",
  "rigid",
  "suprasolicitare",
];

const BONE_JOINT_CONTEXT_TERMS = [
  "lovitura",
  "cazatura",
  "cazut",
  "accident",
  "trauma",
  "profund",
  "deform",
  "umflare mare",
  "umflatura mare",
  "articulatie",
  "fractura",
  "luxatie",
  "nu pot misca",
  "nu pot calca",
  "nu pot sprijini",
];

function makeNoSwitch(
  selected_context_fit: SelectedContextFit,
  reason: string | null = null,
): ContextSwitchAction {
  return {
    selected_context_fit,
    should_switch_context: false,
    target_layer: null,
    target_structure_slug: null,
    target_structure_type: null,
    target_body_region: null,
    switch_reason: reason,
    confidence: "low",
    switch_locked_until_clarification: selected_context_fit === "unclear_need_more_questions",
  };
}

const REGION_CONTEXT_TARGETS: Record<
  string,
  {
    skeletonSlug: string;
    muscularSlug: string;
    bodyRegion: string;
    skeletonLabel: string;
    muscleLabel: string;
  }
> = {
  brat: {
    skeletonSlug: "humerus",
    muscularSlug: "muschi:muschii-bratului",
    bodyRegion: "brat",
    skeletonLabel: "Humerus",
    muscleLabel: "Mușchii brațului",
  },
  cot: {
    skeletonSlug: "humerus",
    muscularSlug: "muschi:muschii-bratului",
    bodyRegion: "brat",
    skeletonLabel: "Humerus",
    muscleLabel: "Mușchii brațului",
  },
  umar: {
    skeletonSlug: "scapula",
    muscularSlug: "muschi:muschii-umarului",
    bodyRegion: "umar",
    skeletonLabel: "Scapule",
    muscleLabel: "Mușchii umărului",
  },
  mana: {
    skeletonSlug: "carp",
    muscularSlug: "muschi:muschii-mainii",
    bodyRegion: "mana",
    skeletonLabel: "Oase carpiene",
    muscleLabel: "Mușchii mâinii",
  },
  genunchi: {
    skeletonSlug: "rotula",
    muscularSlug: "muschi:muschii-coapsei",
    bodyRegion: "genunchi",
    skeletonLabel: "Rotulă",
    muscleLabel: "Mușchii coapsei",
  },
  glezna: {
    skeletonSlug: "tars",
    muscularSlug: "muschi:muschii-gambei",
    bodyRegion: "glezna",
    skeletonLabel: "Oase tarsiene",
    muscleLabel: "Mușchii gambei",
  },
  picior: {
    skeletonSlug: "tars",
    muscularSlug: "muschi:muschii-piciorului",
    bodyRegion: "picior",
    skeletonLabel: "Oase tarsiene",
    muscleLabel: "Mușchii labei piciorului",
  },
  sold: {
    skeletonSlug: "coxal",
    muscularSlug: "muschi:muschii-soldului",
    bodyRegion: "sold",
    skeletonLabel: "Oase coxale",
    muscleLabel: "Mușchii șoldului",
  },
  spate: {
    skeletonSlug: "vert-lombare",
    muscularSlug: "muschi:muschii-spatelui",
    bodyRegion: "spate",
    skeletonLabel: "Vertebre lombare",
    muscleLabel: "Mușchii spatelui",
  },
  gat: {
    skeletonSlug: "vert-cervicale",
    muscularSlug: "muschi:muschii-capului-gatului",
    bodyRegion: "gat",
    skeletonLabel: "Vertebre cervicale",
    muscleLabel: "Mușchii capului și gâtului",
  },
  torace: {
    skeletonSlug: "coaste",
    muscularSlug: "muschi:muschii-toracelui",
    bodyRegion: "torace",
    skeletonLabel: "Coaste",
    muscleLabel: "Mușchii pieptului",
  },
  piept: {
    skeletonSlug: "coaste",
    muscularSlug: "muschi:muschii-toracelui",
    bodyRegion: "torace",
    skeletonLabel: "Coaste",
    muscleLabel: "Mușchii pieptului",
  },
  abdomen: {
    skeletonSlug: "coxal",
    muscularSlug: "muschi:muschii-abdomenului",
    bodyRegion: "abdomen",
    skeletonLabel: "Oase coxale",
    muscleLabel: "Mușchii abdomenului",
  },
  cap: {
    skeletonSlug: "frontal",
    muscularSlug: "muschi:muschii-capului-gatului",
    bodyRegion: "cap_gat",
    skeletonLabel: "Os frontal",
    muscleLabel: "Mușchii capului și gâtului",
  },
};

function regionTarget(regionKey: string | null | undefined) {
  if (!regionKey) return null;
  return REGION_CONTEXT_TARGETS[regionKey] ?? null;
}

const ORGAN_CONTEXT_TARGETS = [
  {
    slug: "organ:rinichi",
    label: "Rinichi",
    bodyRegion: "abdomen",
    terms: ["rinichi", "rinichii", "renal", "lombar", "urina", "urinare"],
  },
  {
    slug: "organ:stomac",
    label: "Stomac",
    bodyRegion: "abdomen",
    terms: ["stomac", "stomacul", "gastric", "greață", "greata", "varsaturi", "voma"],
  },
  {
    slug: "organ:inima",
    label: "Inimă",
    bodyRegion: "torace",
    terms: ["inima", "inimă", "cardiac", "piept", "durere in piept", "toracic"],
  },
  {
    slug: "organ:plamani",
    label: "Plămâni",
    bodyRegion: "torace",
    terms: ["plamani", "plămâni", "respir", "respiratie", "tuse", "aer"],
  },
  {
    slug: "organ:ficat",
    label: "Ficat",
    bodyRegion: "abdomen",
    terms: ["ficat", "hepatic", "dreapta sus", "bila", "bilă"],
  },
  {
    slug: "organ:pancreas",
    label: "Pancreas",
    bodyRegion: "abdomen",
    terms: ["pancreas", "pancreatic", "glicemie", "insulina"],
  },
  {
    slug: "organ:vezica-urinara",
    label: "Vezică urinară",
    bodyRegion: "pelvis",
    terms: ["vezica", "vezică", "urinara", "urinară", "urinare", "pelvis"],
  },
  {
    slug: "organ:intestine",
    label: "Intestine",
    bodyRegion: "abdomen",
    terms: ["intestin", "intestine", "colon", "scaun", "diaree", "constipatie"],
  },
  {
    slug: "organ:splina",
    label: "Splină",
    bodyRegion: "abdomen",
    terms: ["splina", "splină", "stanga sus", "stânga sus"],
  },
];

function organTargetFromText(value: string | undefined) {
  const text = normalizeText(value);
  return ORGAN_CONTEXT_TARGETS.find((target) =>
    target.terms.some((term) => text.includes(normalizeText(term))),
  ) ?? null;
}

function directMuscleTargetFromText(value: string | undefined) {
  const text = normalizeText(value);
  if (hasAny(text, ["biceps", "triceps", "brat", "antebrat", "forearm"])) return REGION_CONTEXT_TARGETS.brat;
  if (hasAny(text, ["cvadriceps", "coapsa", "ischiogambieri", "thigh"])) return REGION_CONTEXT_TARGETS.genunchi;
  if (hasAny(text, ["gamba", "gambei", "molet", "calf"])) return REGION_CONTEXT_TARGETS.glezna;
  if (hasAny(text, ["spate", "lombar", "coloana", "back"])) return REGION_CONTEXT_TARGETS.spate;
  if (hasAny(text, ["umar", "deltoid", "shoulder", "coafa rotatorie", "coafa rotatorilor"])) return REGION_CONTEXT_TARGETS.umar;
  if (hasAny(text, ["pectoral", "piept", "chest"])) return REGION_CONTEXT_TARGETS.piept;
  if (hasAny(text, ["abdomen", "abdominal", "burta", "belly"])) return REGION_CONTEXT_TARGETS.abdomen;
  if (hasAny(text, ["gat", "neck", "ceafa", "cervical"])) return REGION_CONTEXT_TARGETS.gat;
  if (hasAny(text, ["sold", "fesier", "fesa", "hip", "gluteus"])) return REGION_CONTEXT_TARGETS.sold;
  if (hasAny(text, ["picior", "talpa", "plantar", "foot"])) return REGION_CONTEXT_TARGETS.picior;
  if (hasAny(text, ["mana", "deget", "palm", "hand", "incheietura", "wrist"])) return REGION_CONTEXT_TARGETS.mana;
  return null;
}

function directBoneTargetFromText(value: string | undefined) {
  const text = normalizeText(value);
  if (hasAny(text, ["humerus"])) return { slug: "humerus", bodyRegion: "brat", label: "Humerus" };
  if (hasAny(text, ["femur"])) return { slug: "femur", bodyRegion: "coapsa", label: "Femur" };
  if (hasAny(text, ["tibia"])) return { slug: "tibia", bodyRegion: "gamba", label: "Tibia" };
  if (hasAny(text, ["radius"])) return { slug: "radius", bodyRegion: "antebrat", label: "Radius" };
  if (hasAny(text, ["coaste", "coasta", "stern"])) return { slug: "coaste", bodyRegion: "torace", label: "Coaste" };
  if (hasAny(text, ["coloana", "vertebre", "vertebra"])) {
    return { slug: "vert-lombare", bodyRegion: "spate", label: "Vertebre lombare" };
  }
  return null;
}

function muscularTargetForSelection(input: z.infer<typeof InputSchema>, route: AiRoute) {
  const selectedRegion = inferSelectedRegionKey(input);
  const target = regionTarget(route.entities.bodyRegionKey ?? selectedRegion);
  if (target) return target;

  const selectedText = normalizeForScope(
    [input.structureName, input.structureSlug, input.modelSelectionId, input.bodyRegion]
      .filter(Boolean)
      .join(" "),
  );
  if (selectedText.includes("humerus") || selectedText.includes("brat"))
    return REGION_CONTEXT_TARGETS.brat;
  if (selectedText.includes("femur") || selectedText.includes("coapsa"))
    return REGION_CONTEXT_TARGETS.genunchi;
  if (
    selectedText.includes("tibia") ||
    selectedText.includes("fibula") ||
    selectedText.includes("gamba")
  )
    return REGION_CONTEXT_TARGETS.glezna;
  return null;
}

export function evaluateSelectedContextFit(
  input: z.infer<typeof InputSchema>,
  route: AiRoute,
  symptomState: SymptomState,
): ContextSwitchAction {
  const text = normalizeColloquialAddressing(input.question);

  if (route.category === "out_of_scope") return makeNoSwitch("out_of_scope");

  const organTarget = organTargetFromText([input.question, route.entities.bodyRegionLabel].filter(Boolean).join(" "));
  if (organTarget && input.tissue !== "organ") {
    return {
      selected_context_fit: "likely_organ_but_other_selected",
      should_switch_context: true,
      target_layer: "organs",
      target_structure_slug: organTarget.slug,
      target_structure_type: "organ",
      target_body_region: organTarget.bodyRegion,
      switch_reason: `Întrebarea pare despre ${organTarget.label}, deci modul Organe este mai potrivit.`,
      confidence: "high",
      switch_locked_until_clarification: false,
    };
  }

  if (input.tissue === "organ") {
    const directMuscleTarget = directMuscleTargetFromText(input.question);
    if (directMuscleTarget) {
      return {
        selected_context_fit: "likely_muscular_but_bone_selected",
        should_switch_context: true,
        target_layer: "muscular",
        target_structure_slug: directMuscleTarget.muscularSlug,
        target_structure_type: "muscle_group",
        target_body_region: directMuscleTarget.bodyRegion,
        switch_reason: "Întrebarea menționează o grupă musculară, deci Sistemul Muscular este mai potrivit.",
        confidence: "high",
        switch_locked_until_clarification: false,
      };
    }

    const directBoneTarget = directBoneTargetFromText(input.question);
    if (directBoneTarget) {
      return {
        selected_context_fit: "likely_bone_joint_but_muscle_selected",
        should_switch_context: true,
        target_layer: "skeleton",
        target_structure_slug: directBoneTarget.slug,
        target_structure_type: "bone",
        target_body_region: directBoneTarget.bodyRegion,
        switch_reason: `Întrebarea menționează ${directBoneTarget.label}, deci modul Schelet este mai potrivit.`,
        confidence: "high",
        switch_locked_until_clarification: false,
      };
    }
  }

  if (route.category === "red_flag_or_urgent" || symptomState.red_flags_detected) {
    const target = regionTarget(route.entities.bodyRegionKey ?? inferSelectedRegionKey(input));
    return {
      selected_context_fit: "red_flag_priority",
      should_switch_context: Boolean(
        target && (route.selectionConflict || input.tissue === "muschi"),
      ),
      target_layer:
        target && (route.selectionConflict || input.tissue === "muschi") ? "skeleton" : null,
      target_structure_slug:
        target && (route.selectionConflict || input.tissue === "muschi")
          ? target.skeletonSlug
          : null,
      target_structure_type:
        target && (route.selectionConflict || input.tissue === "muschi") ? "bone" : null,
      target_body_region:
        target?.bodyRegion ?? route.entities.bodyRegion ?? input.bodyRegion ?? null,
      switch_reason:
        "Există semne de alarmă; siguranța are prioritate, iar contextul osos/articular poate fi mai potrivit.",
      confidence: target ? "high" : "low",
      switch_locked_until_clarification: true,
    };
  }

  if (route.selectionConflict && route.entities.bodyRegionKey) {
    const target = regionTarget(route.entities.bodyRegionKey);
    const hasBoneSignal =
      hasAny(text, BONE_JOINT_CONTEXT_TERMS) ||
      route.entities.contexts.some((item) => ["căzătură", "lovitură"].includes(item));
    const hasMuscleSignal =
      hasAny(text, MUSCULAR_CONTEXT_TERMS) ||
      route.entities.contexts.some((item) =>
        ["sport", "alergare", "ridicat greutăți", "efort repetitiv"].includes(item),
      );
    const layer: TargetLayer = hasBoneSignal ? "skeleton" : "muscular";
    const slug = layer === "muscular" ? target?.muscularSlug : target?.skeletonSlug;

    return {
      selected_context_fit: "different_body_region_detected",
      should_switch_context: Boolean(target && slug),
      target_layer: target ? layer : null,
      target_structure_slug: slug ?? null,
      target_structure_type: layer === "muscular" ? "muscle_group" : "bone",
      target_body_region: target?.bodyRegion ?? route.entities.bodyRegion,
      switch_reason: `Întrebarea este despre ${route.entities.bodyRegionLabel}, nu despre selecția curentă.`,
      confidence: target ? "high" : "medium",
      switch_locked_until_clarification: false,
    };
  }

  const hasMuscularSignal =
    hasAny(text, MUSCULAR_CONTEXT_TERMS) ||
    (symptomState.last_question_intent === "context_fit_muscular" &&
      isContextualAffirmative(stripPunctuation(text)));
  const hasBoneSignal =
    hasAny(text, BONE_JOINT_CONTEXT_TERMS) ||
    (symptomState.last_question_intent === "context_fit_bone_joint" &&
      isContextualAffirmative(stripPunctuation(text)));
  const vagueOnly = isVaguePainQuestion(text) && !hasMuscularSignal && !hasBoneSignal;

  if (vagueOnly) {
    return makeNoSwitch(
      "unclear_need_more_questions",
      "Mesajul este vag; trebuie clarificat înainte de schimbarea contextului.",
    );
  }

  if (input.tissue === "os" && hasMuscularSignal) {
    const target = muscularTargetForSelection(input, route);
    return {
      selected_context_fit: "likely_muscular_but_bone_selected",
      should_switch_context: Boolean(target),
      target_layer: target ? "muscular" : null,
      target_structure_slug: target ? target.muscularSlug : null,
      target_structure_type: target ? "muscle_group" : null,
      target_body_region: target?.bodyRegion ?? input.bodyRegion ?? null,
      switch_reason:
        "Durerea pare legată de încordare/efort, deci contextul muscular poate fi mai util.",
      confidence: target ? "high" : "low",
      switch_locked_until_clarification: false,
    };
  }

  if (input.tissue === "muschi" && hasBoneSignal) {
    const target = regionTarget(route.entities.bodyRegionKey ?? inferSelectedRegionKey(input));
    return {
      selected_context_fit: "likely_bone_joint_but_muscle_selected",
      should_switch_context: Boolean(target),
      target_layer: target ? "skeleton" : null,
      target_structure_slug: target ? target.skeletonSlug : null,
      target_structure_type: target ? "bone" : null,
      target_body_region: target?.bodyRegion ?? input.bodyRegion ?? null,
      switch_reason:
        "Durerea după lovitură/căzătură sau profundă poate implica osul ori articulația.",
      confidence: target ? "high" : "low",
      switch_locked_until_clarification: false,
    };
  }

  return makeNoSwitch("correct_context");
}

function emptySymptomState(input: z.infer<typeof InputSchema>): SymptomState {
  return {
    selected_structure: input.structureName,
    selected_structure_type: input.tissue,
    selected_region: input.bodyRegion ?? null,
    selected_body_region: input.bodyRegion ?? null,
    visual_layer: input.visualLayer ?? (input.tissue === "organ" ? "organs" : input.tissue === "muschi" ? "muscular" : "skeleton"),
    ai_layer: input.aiLayer ?? (input.tissue === "organ" ? "organs" : input.tissue === "muschi" ? "muscular" : "skeleton"),
    current_topic: "anatomy",
    pain_present: false,
    pain_quality: "unknown",
    trauma_or_effort: "unknown",
    trauma_type: "unknown",
    onset: "unknown",
    movement_ok: "unknown",
    swelling: "unknown",
    bruising: "unknown",
    numbness: "unknown",
    weakness: "unknown",
    deformity: "unknown",
    severity: "unknown",
    duration: "unknown",
    red_flags_detected: false,
    red_flag_reasons: [],
    asked_questions: [],
    answered_fields: [],
    last_question_intent: null,
    next_step: "recommend",
    should_switch_context: false,
    target_layer: null,
    target_structure_slug: null,
    target_body_region: null,
    confidence: "low",
    last_context_switch: null,
    switch_count: 0,
    switch_locked_until_clarification: false,
    asked: {
      trauma_or_effort: false,
      movement_ok: false,
      swelling_or_numbness: false,
      severity: false,
      duration: false,
      onset: false,
    },
  };
}

function markAnswered(state: SymptomState, field: string) {
  state.answered_fields = unique([...state.answered_fields, field]);
}

function isAnswered(state: SymptomState, field: string) {
  return state.answered_fields.includes(field);
}

function syncAnsweredFields(state: SymptomState) {
  if (state.trauma_or_effort !== "unknown") markAnswered(state, "trauma_or_effort");
  if (state.onset !== "unknown") markAnswered(state, "onset");
  if (state.movement_ok !== "unknown") markAnswered(state, "movement_ok");
  if (state.severity !== "unknown") markAnswered(state, "severity");
  if (state.duration !== "unknown") markAnswered(state, "duration");
  if (
    state.swelling !== "unknown" &&
    state.numbness !== "unknown" &&
    state.bruising !== "unknown"
  ) {
    markAnswered(state, "associated_signs");
  }
}

function decidePainNextStep(state: SymptomState): SymptomNextStep {
  if (
    state.red_flags_detected &&
    (state.movement_ok === "no" ||
      state.deformity === "yes" ||
      state.numbness === "yes" ||
      state.weakness === "yes")
  ) {
    return "urgent";
  }
  if (state.pain_present && !isAnswered(state, "trauma_or_effort")) return "ask_trauma_or_effort";
  if (state.trauma_or_effort !== "unknown" && !isAnswered(state, "onset")) return "ask_onset";
  if (state.onset !== "unknown" && !isAnswered(state, "movement_ok")) return "ask_movement";
  if (state.movement_ok !== "unknown" && !isAnswered(state, "severity")) return "ask_severity";
  if (state.severity !== "unknown" && !isAnswered(state, "associated_signs"))
    return "ask_associated_signs";
  if (isAnswered(state, "associated_signs") && !isAnswered(state, "duration"))
    return "ask_duration";
  if (state.red_flags_detected) return "urgent";
  return "recommend";
}

function detectAskedFields(message: string, state: SymptomState) {
  const text = stripPunctuation(message);
  const askedTrauma = hasAny(text, [
    "lovitura",
    "cazatura",
    "cazut",
    "efort",
    "accident",
    "impact",
    "fall",
    "exertion",
    "strain",
    "injury",
  ]);
  const askedMovement = hasAny(text, [
    "poti misca",
    "misti zona",
    "misti bratul",
    "miscare normal",
    "ridici",
    "miscarea",
    "can you move",
    "move the area",
    "move it normally",
    "range of motion",
    "lift your",
  ]);

  if (
    (hasAny(text, ["te referi la"]) && hasAny(text, ["durere", "zona"])) ||
    (hasAny(text, ["referring to"]) && hasAny(text, ["pain", "area"]))
  ) {
    state.last_question_intent = "structure_or_pain_clarification";
    state.asked_questions.push("structure_or_pain_clarification");
  }
  if (
    hasAny(text, [
      "incordezi",
      "folosesti muschiul",
      "efort",
      "sport",
      "sala",
      "intindere",
      "crampa",
      "muscle strain",
      "muscle use",
      "overexertion",
      "cramp",
    ])
  ) {
    state.last_question_intent = "context_fit_muscular";
    state.asked_questions.push("context_fit_muscular");
  }
  if (
    hasAny(text, [
      "durerea este profunda",
      "umflatura",
      "deformare",
      "lovitura",
      "cazatura",
      "accident",
      "deep pain",
      "swelling",
      "deformity",
      "impact",
      "fall",
    ])
  ) {
    state.last_question_intent = "context_fit_bone_joint";
    state.asked_questions.push("context_fit_bone_joint");
  }

  if (askedTrauma) {
    state.asked.trauma_or_effort = true;
    state.last_question_intent = "trauma_or_effort";
    state.asked_questions.push("trauma_or_effort");
  }
  if (hasAny(text, ["brusc", "treptat", "suddenly", "gradually", "start suddenly", "did it start"])) {
    state.asked.onset = true;
    state.last_question_intent = "onset";
    state.asked_questions.push("onset");
  }
  if (askedMovement) {
    state.asked.movement_ok = true;
    state.last_question_intent = "movement_ok";
    state.asked_questions.push("movement_ok");
  }
  if (
    askedMovement &&
    hasAny(text, ["severa", "sever", "cat de severa", "intensitate", "mild", "moderate", "how strong", "how bad", "intensity"])
  ) {
    state.asked.movement_ok = true;
    state.asked.severity = true;
    state.last_question_intent = "severity_or_movement";
    state.asked_questions.push("severity_or_movement", "movement_ok", "severity");
  }
  if (askedTrauma && askedMovement) {
    state.last_question_intent = "trauma_or_effort_and_movement";
  }
  if (
    hasAny(text, [
      "umflatura",
      "vanataie",
      "amorteala",
      "slabiciune",
      "deformare",
      "swelling",
      "bruising",
      "numbness",
      "weakness",
      "tingling",
    ])
  ) {
    state.asked.swelling_or_numbness = true;
    state.last_question_intent = "associated_signs";
    state.asked_questions.push("associated_signs");
  }
  if (
    hasAny(text, [
      "usoara",
      "moderata",
      "severa",
      "cat de severa",
      "intensitate",
      "mild",
      "moderate",
      "how strong",
      "how bad",
      "intensity",
      "scale of",
    ]) &&
    state.last_question_intent !== "severity_or_movement"
  ) {
    state.asked.severity = true;
    state.last_question_intent = "severity";
    state.asked_questions.push("severity");
  }
  if (
    hasAny(text, [
      "cand a inceput",
      "de cand",
      "cat timp",
      "how long",
      "when did it start",
      "how many days",
      "since when",
    ])
  ) {
    state.asked.duration = true;
    state.last_question_intent = "duration";
    state.asked_questions.push("duration");
  }
  state.asked_questions = unique(state.asked_questions);
}

function isContextualAffirmative(text: string) {
  return /\b(da|dap|normal|pot|yes|yeah|yep|yup|sure|ok|okay|correct|right|indeed|exactly)\b/.test(text);
}

function isContextualNegative(text: string) {
  return /\b(nu|nicio|niciuna|fara|deloc|no|nope|not|none|without|neither|never|nah)\b/.test(text);
}

function isMovementOkReply(text: string) {
  return (
    text === "pot" ||
    /\b(da|dap)\b.*\bpot\b/.test(text) ||
    /\bpot\b.*\b(misca|misc|normal)\b/.test(text) ||
    /\b(misc|misca|miscarea|se misca)\b.*\bnormal\b/.test(text) ||
    text === "normal" ||
    /\b(yes|yeah|yep)\b.*\b(can|move)\b/.test(text) ||
    /\bcan\b.*\b(move|use)\b.*\b(it|area|normally|fine|ok)\b/.test(text) ||
    hasAny(text, ["moves fine", "moving fine", "move normally", "can move", "still moving"])
  );
}

function isMovementBlockedReply(text: string) {
  return hasAny(text, [
    "nu pot misca",
    "nu pot sa misc",
    "nu pot",
    "deloc",
    "nu misc",
    "nu se misca",
    "can't move",
    "cannot move",
    "can't use",
    "cannot use",
    "can't lift",
    "cannot lift",
    "stuck",
    "locked",
    "won't move",
    "doesn't move",
  ]);
}

function parseSeverity(text: string): SymptomState["severity"] | null {
  if (hasAny(text, ["putin", "usoara", "usor", "suportabil", "mild", "slight", "light", "bearable", "a little", "a bit"])) return "mild";
  if (hasAny(text, ["moderata", "moderat", "medie", "moderate", "medium", "manageable"])) return "moderate";
  if (
    hasAny(text, [
      "tare",
      "foarte tare",
      "foarte rau",
      "durere mare",
      "durere severa",
      "severa",
      "sever",
      "insuportabil",
      "nu suport",
      "severe",
      "very bad",
      "very strong",
      "unbearable",
      "intense",
      "excruciating",
      "sharp pain",
      "really bad",
      "very painful",
    ])
  ) {
    return "severe";
  }
  return null;
}

function parsePainQuality(text: string): PainQuality {
  return (
    PAIN_QUALITY_TERMS.find((entry) => entry.terms.some((term) => text.includes(term)))?.key ??
    "unknown"
  );
}

function painQualityLabel(quality: PainQuality, lang: "ro" | "en" = "ro") {
  if (lang === "en") {
    const labels: Record<PainQuality, string> = {
      unknown: "unknown",
      stabbing: "stabbing",
      burning: "burning",
      throbbing: "throbbing",
      dull: "dull",
      sharp: "sharp",
      pressure: "pressure-like",
      pulling: "pulling",
      cramp: "cramping",
    };
    return labels[quality];
  }
  const labels: Record<PainQuality, string> = {
    unknown: "necunoscută",
    stabbing: "înțepătoare",
    burning: "arzătoare",
    throbbing: "pulsatilă",
    dull: "surdă",
    sharp: "ascuțită",
    pressure: "ca o presiune",
    pulling: "ca o tragere",
    cramp: "ca o crampă",
  };
  return labels[quality];
}

function parseOnset(text: string): SymptomState["onset"] | null {
  if (
    hasAny(text, [
      "brusc",
      "dintr o data",
      "dintr-o data",
      "deodata",
      "a aparut dintr o data",
      "suddenly",
      "all of a sudden",
      "out of nowhere",
      "just started",
      "came out of nowhere",
      "appeared suddenly",
    ])
  )
    return "sudden";
  if (
    hasAny(text, [
      "treptat",
      "incet",
      "gradually",
      "slowly",
      "over time",
      "little by little",
      "got worse over",
    ])
  )
    return "gradual";
  return null;
}

function parseDuration(text: string): SymptomState["duration"] | null {
  if (hasAny(text, ["minute", "acum putin", "minutes", "just now", "a moment ago"])) return "minutes";
  if (
    hasAny(text, [
      "ore",
      "ora",
      "de azi",
      "azi",
      "hours",
      "this morning",
      "this afternoon",
      "a few hours",
    ])
  )
    return "hours";
  if (
    hasAny(text, [
      "o zi",
      "1 zi",
      "de ieri",
      "ieri",
      "de cateva zile",
      "cateva zile",
      "de zile",
      "days",
      "yesterday",
      "a few days",
      "couple of days",
      "since yesterday",
      "few days",
    ])
  )
    return "days";
  if (hasAny(text, ["saptamana", "o saptamana", "1 saptamana", "week", "weeks", "a week"]))
    return "week_plus";
  if (
    hasAny(text, [
      "cronic",
      "luni",
      "de mult",
      "months",
      "chronic",
      "a long time",
      "for a long time",
      "months now",
      "long time",
    ])
  )
    return "chronic";
  return null;
}

function isContextualReply(question: string, state: SymptomState) {
  const text = stripPunctuation(question);
  if (!state.last_question_intent) return false;
  return (
    isContextualAffirmative(text) ||
    isContextualNegative(text) ||
    isMovementOkReply(text) ||
    parsePainQuality(text) !== "unknown" ||
    Boolean(parseDuration(text)) ||
    hasAny(text, [
      "putin",
      "tare",
      "sever",
      "brusc",
      "treptat",
      "usor",
      "usoara",
      "moderat",
      "moderata",
      "nu pot",
      "a bit",
      "really",
      "severe",
      "suddenly",
      "gradually",
      "slightly",
      "mild",
      "moderate",
      "can't",
      "cannot",
    ])
  );
}

function isStructureClarificationReply(route: AiRoute, symptomState: SymptomState) {
  return (
    symptomState.last_question_intent === "structure_or_pain_clarification" &&
    route.selectedSubjectMentioned
  );
}

function applySymptomFactsFromText(
  message: string,
  state: SymptomState,
  previousAssistant?: string,
) {
  const text = stripPunctuation(message);
  const previous = stripPunctuation(previousAssistant ?? "");
  const intent = state.last_question_intent;
  const isNegative =
    hasAny(text, [
      "nu",
      "nicio",
      "niciuna",
      "nici una",
      "n am",
      "n-am",
      "nu am",
      "fara",
      "deloc",
      "nope",
      "nah",
      "didnt",
      "havent",
      "without",
      "neither",
      "never",
      "none",
    ]) || isContextualNegative(text);
  const isPositive = isContextualAffirmative(text) || hasAny(text, ["a aparut", "dupa", "am"]);

  if (
    intent === "trauma_or_effort_and_movement" &&
    (isContextualAffirmative(text) || isContextualNegative(text))
  ) {
    return;
  }

  const parsedPainQuality = parsePainQuality(text);
  if (parsedPainQuality !== "unknown") {
    state.pain_quality = parsedPainQuality;
    state.current_topic = "pain";
    markAnswered(state, "pain_quality");
  }

  if (
    hasAny(text, [
      "ma doare",
      "ma dor",
      "ma inteapa",
      "durere",
      "doare",
      "dureros",
      "pain",
      "hurts",
      " hurt",
      "aching",
      " ache",
      "sore",
      "painful",
      "it hurts",
      "i have pain",
    ]) ||
    parsedPainQuality !== "unknown"
  ) {
    state.pain_present = true;
    state.current_topic = "pain";
  }

  if (
    hasAny(text, [
      "lovitura",
      "cazatura",
      "cazut",
      "efort",
      "accident",
      "trauma",
      "fell",
      "fall",
      "hit",
      "impact",
      "injured",
      "injury",
      "twisted",
      "sprained",
      "sport",
      "exercise",
      "exertion",
      "gym",
      "running",
      "strain",
      "lifted",
      "overuse",
    ])
  ) {
    state.trauma_or_effort = isNegative ? "no" : "yes";
    markAnswered(state, "trauma_or_effort");
    state.trauma_type = isNegative
      ? "none"
      : hasAny(text, ["cazatura", "cazut", "fell", "fall", "tripped"])
        ? "fall"
        : hasAny(text, ["lovitura", "hit", "struck", "impact"])
          ? "hit"
          : hasAny(text, ["sport", "exercise", "gym", "running", "playing"])
            ? "sport"
            : hasAny(text, ["efort", "exertion", "strain", "lifted", "carried", "overuse"])
              ? "effort"
              : "unknown";
  } else if (state.asked.trauma_or_effort && isNegative) {
    state.trauma_or_effort = "no";
    state.trauma_type = "none";
    markAnswered(state, "trauma_or_effort");
  } else if (
    state.asked.trauma_or_effort &&
    isPositive &&
    !hasAny(text, ["niciuna", "nici una", "deloc", "fara"])
  ) {
    state.trauma_or_effort = "yes";
    markAnswered(state, "trauma_or_effort");
  }

  const isMovementQuestionContext =
    intent === "movement_ok" ||
    intent === "severity_or_movement" ||
    (!intent &&
      hasAny(previous, [
        "poti misca",
        "miscare normal",
        "durerea este severa",
        "can you move",
        "move normally",
        "is the pain severe",
        "range of motion",
      ]));

  if (
    isMovementBlockedReply(text) ||
    hasAny(text, [
      "nu pot folosi",
      "nu pot ridica",
      "miscarea e limitata",
      "cant use",
      "cannot use",
      "cant lift",
      "cannot lift",
      "limited movement",
      "limited range",
    ])
  ) {
    state.movement_ok = "no";
    markAnswered(state, "movement_ok");
  } else if (
    isMovementQuestionContext &&
    (isMovementOkReply(text) ||
      ((intent === "movement_ok" || intent === "severity_or_movement") &&
        isContextualAffirmative(text)))
  ) {
    state.movement_ok = "yes";
    state.asked.movement_ok = true;
    markAnswered(state, "movement_ok");
    state.asked_questions = unique([
      ...state.asked_questions,
      "movement_ok",
      "severity_or_movement",
    ]);
  } else if (isMovementQuestionContext && isNegative && !hasAny(text, ["niciuna", "nici una"])) {
    state.movement_ok = "no";
    markAnswered(state, "movement_ok");
  }

  if (hasAny(text, ["umflatura", "umflat", "swelling", "swollen", "puffy"])) {
    state.swelling = isNegative ? "no" : "yes";
  } else if (
    intent === "associated_signs" &&
    isNegative &&
    hasAny(previous, ["umflatura", "umflat", "swelling", "swollen"])
  ) {
    state.swelling = "no";
  }

  if (hasAny(text, ["vanataie", "vanat", "bruising", "bruise", "bruised", "black and blue"])) {
    state.bruising = isNegative ? "no" : "yes";
  } else if (
    intent === "associated_signs" &&
    isNegative &&
    hasAny(previous, ["vanataie", "vanat", "bruising", "bruise"])
  ) {
    state.bruising = "no";
  }

  if (
    hasAny(text, [
      "amorteala",
      "amortit",
      "slabiciune",
      "furnicaturi",
      "numbness",
      "numb",
      "tingling",
      "pins and needles",
    ])
  ) {
    state.numbness = isNegative ? "no" : "yes";
  } else if (
    intent === "associated_signs" &&
    isNegative &&
    hasAny(previous, ["amorteala", "amortit", "furnicaturi", "numbness", "tingling"])
  ) {
    state.numbness = "no";
  }

  if (
    hasAny(text, [
      "slabiciune",
      "nu am forta",
      "pierdere de forta",
      "weakness",
      "weak",
      "no strength",
    ])
  ) {
    state.weakness = isNegative ? "no" : "yes";
  } else if (
    intent === "associated_signs" &&
    isNegative &&
    hasAny(previous, ["slabiciune", "forta", "weakness", "strength"])
  ) {
    state.weakness = "no";
  }

  if (
    hasAny(text, [
      "deform",
      "stramb",
      "os iesit",
      "deformity",
      "deformed",
      "bent",
      "crooked",
      "misshapen",
    ])
  ) {
    state.deformity = isNegative ? "no" : "yes";
  } else if (
    intent === "associated_signs" &&
    isNegative &&
    hasAny(previous, ["deform", "stramb", "os iesit", "deformity", "bent"])
  ) {
    state.deformity = "no";
  }

  if (intent === "associated_signs" && isNegative) {
    if (hasAny(previous, ["umflatura", "umflat", "swelling", "swollen"])) state.swelling = "no";
    if (hasAny(previous, ["vanataie", "vanat", "bruising", "bruise"])) state.bruising = "no";
    if (hasAny(previous, ["amorteala", "amortit", "furnicaturi", "numbness", "tingling"])) state.numbness = "no";
    if (hasAny(previous, ["slabiciune", "forta", "weakness", "strength"])) state.weakness = "no";
    if (hasAny(previous, ["deform", "stramb", "os iesit", "deformity", "bent"])) state.deformity = "no";
    markAnswered(state, "associated_signs");
  }

  if (intent === "associated_signs") {
    const askedCoreSigns =
      hasAny(previous, ["umflatura", "umflat"]) &&
      hasAny(previous, ["amorteala", "amortit", "furnicaturi"]) &&
      hasAny(previous, ["vanataie", "vanat"]);
    if (
      askedCoreSigns &&
      state.swelling !== "unknown" &&
      state.numbness !== "unknown" &&
      state.bruising !== "unknown"
    ) {
      markAnswered(state, "associated_signs");
    }
  }

  const parsedSeverity = parseSeverity(text);
  if (parsedSeverity) {
    state.severity = parsedSeverity;
    markAnswered(state, "severity");
  }

  const parsedOnset = parseOnset(text);
  if (parsedOnset) {
    state.onset = parsedOnset;
    markAnswered(state, "onset");
  }
  const parsedDuration = parseDuration(text);
  if (parsedDuration) {
    state.duration = parsedDuration;
    markAnswered(state, "duration");
  }

  const redFlagReasons = collectMatches(text, RED_FLAG_TERMS).filter((flag) => {
    if (
      [
        "ma doare",
        "ma dor",
        "doare",
        "dupa niciuna",
        "niciuna",
        "dintr o data",
        "de azi",
        "putin",
      ].some((safe) => text.includes(safe))
    ) {
      return !["traumatism puternic", "durere severă"].includes(flag);
    }
    return true;
  });
  if (state.severity === "severe") redFlagReasons.push("durere severă");
  if (state.movement_ok === "no") redFlagReasons.push("imposibilitate de mișcare");
  if (state.numbness === "yes") redFlagReasons.push("amorțeală");
  if (state.weakness === "yes") redFlagReasons.push("slăbiciune bruscă");
  if (state.deformity === "yes") redFlagReasons.push("deformare vizibilă");

  state.red_flag_reasons = unique([...state.red_flag_reasons, ...redFlagReasons]).filter(
    (reason) => !(state.movement_ok === "yes" && reason === "imposibilitate de mișcare"),
  );
  state.red_flags_detected = state.red_flag_reasons.length > 0;
  syncAnsweredFields(state);
  state.next_step = decidePainNextStep(state);
}

export function inferSymptomState(
  input: z.infer<typeof InputSchema>,
  previousMessages: ConversationMessage[],
): SymptomState {
  const state = emptySymptomState(input);
  let previousAssistant = "";

  for (const message of previousMessages) {
    if (message.role === "assistant") {
      previousAssistant = message.content_ro;
      detectAskedFields(message.content_ro, state);
      continue;
    }

    if (message.role === "user") {
      applySymptomFactsFromText(message.content_ro, state, previousAssistant);
    }
  }

  applySymptomFactsFromText(input.question, state, previousAssistant);
  return state;
}

function isShortSymptomFollowUp(question: string, state: SymptomState) {
  const text = stripPunctuation(question);
  return state.pain_present && text.split(/\s+/).length <= 6;
}

export function classifyQuestion(input: z.infer<typeof InputSchema>): AiRoute {
  const text = normalizeColloquialAddressing(input.question);
  const entities = extractQuestionEntities(text);
  const recognizableIntent = hasRecognizableIntent(text, entities);
  const selectedRegionKey = inferSelectedRegionKey(input);
  const selectionConflict =
    Boolean(entities.bodyRegionKey) &&
    Boolean(selectedRegionKey) &&
    !areRelatedRegions(selectedRegionKey, entities.bodyRegionKey);
  const target = targetForEntities(entities);
  const conflictNote = selectionConflict
    ? `Ai pornit de la ${input.structureName}, dar întrebarea pare să fie despre ${entities.bodyRegionLabel}.`
    : null;
  const shouldUpdate3dSelection =
    selectionConflict &&
    Boolean(target.targetStructureSlug && target.targetStructureType && target.targetBodyRegion);
  const selectedTerms = [input.structureName, input.structureSlug, input.modelSelectionId]
    .flatMap((value) => {
      const normalized = normalizeColloquialAddressing(value);
      return [normalized, ...normalized.split(/[^a-z0-9]+/g)];
    })
    .filter((value) => value.length >= 3);
  const selectedSubjectMentioned = unique(selectedTerms).some((term) => text.includes(term));
  const hasRedFlag = entities.redFlags.length > 0;
  const hasSymptomOrInjury =
    entities.symptoms.length > 0 ||
    entities.contexts.length > 0 ||
    PAIN_QUALITY_TERMS.some((entry) => entry.terms.some((term) => text.includes(term))) ||
    hasAny(text, [
      "ma doare",
      "ma inteapa",
      "inteapa",
      "accidentare",
      "trauma",
      "lovitura",
      "cazut",
      "sport",
      "alerg",
    ]);
  const isAppSpecific = APP_SPECIFIC_TERMS.some((term) => text.includes(term));
  const isMedical =
    MEDICAL_GENERAL_TERMS.some((term) => text.includes(term)) ||
    hasSymptomOrInjury ||
    !!entities.bodyRegion;
  const isOutOfScope =
    OUT_OF_SCOPE_TERMS.some((term) => text.includes(term)) && !isMedical && !isAppSpecific;

  if (isOutOfScope) {
    return {
      category: "out_of_scope",
      mode: null,
      entities,
      reason: "Întrebarea nu are legătură cu sănătatea sau aplicația.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict: false,
      conflictNote: null,
      targetStructureSlug: null,
      targetStructureType: null,
      targetBodyRegion: null,
      shouldUpdate3dSelection: false,
    };
  }

  if (!recognizableIntent) {
    if (input.lang === "en" && text.trim().length > 0) {
      if (input.structureName || input.structureSlug) {
        return {
          category: "selection_specific",
          mode: "3D_SELECTION_MODE",
          entities,
          reason: "English message not matched by RO patterns — routed to LLM via selection.",
          selectedSubjectMentioned,
          selectedRegionKey,
          selectionConflict: false,
          conflictNote: null,
          ...target,
          shouldUpdate3dSelection: false,
        };
      }
      return {
        category: "medical_general",
        mode: "GENERAL_MEDICAL_MODE",
        entities,
        reason: "English message not matched by RO patterns — routed to LLM.",
        selectedSubjectMentioned,
        selectedRegionKey,
        selectionConflict: false,
        conflictNote: null,
        ...target,
        shouldUpdate3dSelection: false,
      };
    }
    return {
      category: "unclear_message",
      mode: null,
      entities,
      reason: "Mesajul nu conține o intenție clară, simptom inteligibil sau întrebare anatomică.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict: false,
      conflictNote: null,
      targetStructureSlug: null,
      targetStructureType: null,
      targetBodyRegion: null,
      shouldUpdate3dSelection: false,
    };
  }

  if (isAppSpecific && !isMedical) {
    return {
      category: "app_specific",
      mode: null,
      entities,
      reason: "Întrebarea cere date interne despre Santix.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict: false,
      conflictNote: null,
      targetStructureSlug: null,
      targetStructureType: null,
      targetBodyRegion: null,
      shouldUpdate3dSelection: false,
    };
  }

  if (hasRedFlag) {
    return {
      category: "red_flag_or_urgent",
      mode: "GENERAL_MEDICAL_MODE",
      entities,
      reason: "Conține semne de alarmă.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict,
      conflictNote,
      ...target,
      shouldUpdate3dSelection,
    };
  }

  if (hasSymptomOrInjury) {
    return {
      category: "symptom_or_injury",
      mode: "GENERAL_MEDICAL_MODE",
      entities,
      reason: "Descrie durere, simptom, efort sau traumatism.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict,
      conflictNote,
      ...target,
      shouldUpdate3dSelection,
    };
  }

  if (selectedSubjectMentioned || SELECTION_TERMS.some((term) => text.includes(term))) {
    return {
      category: "selection_specific",
      mode: "3D_SELECTION_MODE",
      entities,
      reason: "Întrebare despre structura selectată sau anatomie.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict,
      conflictNote,
      ...target,
      shouldUpdate3dSelection,
    };
  }

  if (isMedical) {
    return {
      category: "medical_general",
      mode: "GENERAL_MEDICAL_MODE",
      entities,
      reason: "Întrebare medicală/anatomică generală.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict,
      conflictNote,
      ...target,
      shouldUpdate3dSelection,
    };
  }

  if (input.lang === "en" && text.trim().length > 0) {
    if (input.structureName || input.structureSlug) {
      return {
        category: "selection_specific",
        mode: "3D_SELECTION_MODE",
        entities,
        reason: "English fallback — routed to LLM via selection.",
        selectedSubjectMentioned,
        selectedRegionKey,
        selectionConflict: false,
        conflictNote: null,
        ...target,
        shouldUpdate3dSelection: false,
      };
    }
    return {
      category: "medical_general",
      mode: "GENERAL_MEDICAL_MODE",
      entities,
      reason: "English fallback — routed to LLM.",
      selectedSubjectMentioned,
      selectedRegionKey,
      selectionConflict: false,
      conflictNote: null,
      ...target,
      shouldUpdate3dSelection: false,
    };
  }

  return {
    category: "unclear_message",
    mode: null,
    entities,
    reason: "Fallback către clarificarea intenției utilizatorului.",
    selectedSubjectMentioned,
    selectedRegionKey,
    selectionConflict: false,
    conflictNote: null,
    targetStructureSlug: null,
    targetStructureType: null,
    targetBodyRegion: null,
    shouldUpdate3dSelection: false,
  };
}

const MUSCLE_REGION_SCOPES: Array<{
  terms: string[];
  structureSlug: string;
  bodyRegion: string;
}> = [
  {
    terms: [
      "muschii-mainii",
      "mana",
      "hand",
      "palmar",
      "carpal",
      "pollicis",
      "lumbrical",
      "interossei",
      "thenar",
      "hypothenar",
    ],
    structureSlug: "muschi-mana-antebrat",
    bodyRegion: "mana_antebrat",
  },
  {
    terms: [
      "muschii-antebratului",
      "antebrat",
      "forearm",
      "flexor-carpi",
      "extensor-carpi",
      "extensor-indicis",
      "extensor-digiti-minimi",
      "pronator",
      "supinator",
      "brachioradialis",
      "palmaris",
    ],
    structureSlug: "muschi-mana-antebrat",
    bodyRegion: "mana_antebrat",
  },
  {
    terms: [
      "muschii-bratului",
      "brat",
      "compartment-of-arm",
      "biceps",
      "triceps",
      "brachialis",
      "anconeus",
    ],
    structureSlug: "muschi-brat-umar",
    bodyRegion: "membru_superior",
  },
  {
    terms: [
      "muschii-umarului",
      "umar",
      "shoulder",
      "deltoid",
      "supraspinatus",
      "infraspinatus",
      "subscapularis",
    ],
    structureSlug: "muschi-brat-umar",
    bodyRegion: "membru_superior",
  },
  {
    terms: [
      "muschii-abdomenului",
      "muschii-toracelui",
      "muschii-spatelui",
      "abdomen",
      "torace",
      "trunchi",
      "spate",
      "external-abdominal-oblique",
      "internal-abdominal-oblique",
      "rectus-abdominis",
      "intercostal",
      "diaphragm",
      "trapezius",
      "latissimus",
      "erector-spinae",
      "multifidus",
    ],
    structureSlug: "muschi-trunchi",
    bodyRegion: "trunchi",
  },
  {
    terms: [
      "muschii-coapsei",
      "muschii-gambei",
      "muschii-soldului",
      "muschii-bazinului",
      "coapsa",
      "gamba",
      "sold",
      "bazin",
      "compartment-of-thigh",
      "compartment-of-leg",
      "iliopectineal-arch",
      "levator-ani",
      "tibialis",
      "gastrocnemius",
      "soleus",
      "sartorius",
      "vastus",
      "gluteus",
    ],
    structureSlug: "muschi-membru-inferior",
    bodyRegion: "membru_inferior",
  },
  {
    terms: [
      "muschii-piciorului",
      "picior",
      "laba-piciorului",
      "foot",
      "plantar",
      "digitorum-brevis",
      "hallucis-brevis",
      "adductor-hallucis",
      "abductor-hallucis",
    ],
    structureSlug: "muschi-picior",
    bodyRegion: "picior",
  },
  {
    terms: [
      "muschii-capului-gatului",
      "cap-gat",
      "gat",
      "neck",
      "head",
      "temporoparietal",
      "temporoparietalis",
      "temporalis",
      "bucinator",
      "buccinator",
      "corrugator",
      "depressor",
      "levator-anguli",
      "levator-labii",
      "levator-nasolabialis",
      "masseter",
      "orbicularis",
      "pterygoid",
      "sternocleidomastoid",
      "scalenus",
      "superior-oblique",
      "inferior-oblique",
      "superior-rectus",
      "inferior-rectus",
      "lateral-rectus",
      "medial-rectus",
      "orbicularis-oculi",
      "pharyngeal-constrictor",
      "common-tendinous-ring",
      "inferior-tarsus",
    ],
    structureSlug: "muschi-cap-gat",
    bodyRegion: "cap_gat",
  },
];

const BONE_REGION_SCOPES: Array<{
  terms: string[];
  structureSlug?: string;
  modelSelectionId?: string;
  bodyRegion: string;
}> = [
  {
    terms: [
      "craniu",
      "frontal",
      "parietal",
      "temporal",
      "occipital",
      "sphenoid",
      "ethmoid",
      "clinoid",
      "sella",
      "petrous",
      "foramen-magnum",
      "cranial-fossa",
    ],
    bodyRegion: "cap_craniu",
  },
  {
    terms: [
      "fata",
      "maxilla",
      "mandible",
      "zygomatic",
      "nasal",
      "lacrimal",
      "palatine",
      "vomer",
      "concha",
      "orbital",
      "alveolar",
      "infraorbital",
      "mental-foramen",
      "arytenoid",
      "laryngeal",
    ],
    bodyRegion: "fata",
  },
  {
    terms: ["ureche-medie", "malleus", "incus", "stapes"],
    bodyRegion: "ureche_medie",
  },
  {
    terms: ["hioid", "hyoid"],
    structureSlug: "hioid",
    modelSelectionId: "hioid",
    bodyRegion: "gat",
  },
  {
    terms: ["coloana-cervicala", "cervical", "atlas", "axis"],
    structureSlug: "vert-cervicale",
    modelSelectionId: "vert-cervicale",
    bodyRegion: "coloana",
  },
  {
    terms: ["coloana-toracala", "thoracic"],
    structureSlug: "vert-toracice",
    modelSelectionId: "vert-toracice",
    bodyRegion: "coloana",
  },
  {
    terms: ["coloana-lombara", "lumbar"],
    structureSlug: "vert-lombare",
    modelSelectionId: "vert-lombare",
    bodyRegion: "coloana",
  },
  {
    terms: ["coloana", "vertebra", "sacrum", "coccyx"],
    bodyRegion: "coloana",
  },
  {
    terms: ["cutie-toracica", "rib", "sternum", "manubrium", "xiphoid"],
    bodyRegion: "torace",
  },
  {
    terms: [
      "centura-scapulara",
      "clavicle",
      "scapula",
      "acromion",
      "acromial",
      "coracoid",
      "glenoid",
    ],
    bodyRegion: "umar_centura_scapulara",
  },
  {
    terms: ["brat", "humerus", "humeral", "trochlea", "capitulum", "deltoid-tuberosity"],
    structureSlug: "humerus",
    modelSelectionId: "humerus",
    bodyRegion: "brat",
  },
  {
    terms: ["antebrat", "radius", "radial", "ulna", "ulnar", "olecranon"],
    bodyRegion: "antebrat",
  },
  {
    terms: ["schelet-mana", "carpal", "metacarpal", "phalanx-of-hand"],
    bodyRegion: "mana",
  },
  {
    terms: [
      "bazin",
      "muschii-bazinului",
      "hip-bone",
      "ilium",
      "ischium",
      "pubis",
      "acetabulum",
      "acetabular",
      "obturator",
      "iliac",
      "ischial",
      "pubic",
      "sacral",
      "gluteal-line",
      "iliopectineal-arch",
      "levator-ani",
    ],
    structureSlug: "coxal",
    modelSelectionId: "coxal",
    bodyRegion: "pelvis",
  },
  {
    terms: [
      "coapsa",
      "femur",
      "femoral",
      "patella",
      "patellar",
      "trochanter",
      "linea-aspera",
      "intercondylar-area",
    ],
    bodyRegion: "coapsa_sold_genunchi",
  },
  {
    terms: ["gamba", "tibia", "tibial", "fibula", "fibular", "malleolus"],
    bodyRegion: "gamba",
  },
  {
    terms: [
      "schelet-picior",
      "tarsal",
      "metatarsal",
      "phalanx-of-foot",
      "calcaneus",
      "talus",
      "cuboid",
      "cuneiform",
      "navicular",
    ],
    bodyRegion: "picior",
  },
];

function inferSelectionScope(input: z.infer<typeof InputSchema>): SelectionScope {
  if (input.tissue === "organ") {
    const modelSelectionId = input.modelSelectionId ?? input.structureSlug ?? null;
    const rawSlug = input.structureSlug ?? input.modelSelectionId ?? null;
    const structureSlug = rawSlug?.startsWith("organ:")
      ? rawSlug.replace("organ:", "organ-")
      : rawSlug;

    return {
      structureSlug,
      modelSelectionId,
      bodyRegion: input.bodyRegion ?? null,
    };
  }

  const explicitStructureSlug = input.structureSlug?.includes(":")
    ? input.structureSlug.split(":").pop()
    : input.structureSlug;
  const explicitModelSelectionId = input.modelSelectionId?.includes(":")
    ? input.modelSelectionId.split(":").pop()
    : input.modelSelectionId;

  if (input.tissue !== "muschi") {
    if (input.tissue === "os") {
      const searchable = [
        explicitStructureSlug,
        explicitModelSelectionId,
        input.structureName,
        input.bodyRegion,
      ]
        .map(normalizeForScope)
        .join(" ");

      const matchedScope = BONE_REGION_SCOPES.find((scope) =>
        scope.terms.some((term) => searchable.includes(normalizeForScope(term))),
      );

      if (matchedScope) {
        return {
          structureSlug: matchedScope.structureSlug ?? explicitStructureSlug ?? null,
          modelSelectionId:
            matchedScope.modelSelectionId ??
            matchedScope.structureSlug ??
            explicitModelSelectionId ??
            null,
          bodyRegion: matchedScope.bodyRegion,
        };
      }
    }

    return {
      structureSlug: explicitStructureSlug ?? null,
      modelSelectionId: explicitModelSelectionId ?? null,
      bodyRegion: input.bodyRegion ?? null,
    };
  }

  const searchable = [
    explicitStructureSlug,
    explicitModelSelectionId,
    input.structureName,
    input.bodyRegion,
  ]
    .map(normalizeForScope)
    .join(" ");

  const matchedScope = MUSCLE_REGION_SCOPES.find((scope) =>
    scope.terms.some((term) => searchable.includes(normalizeForScope(term))),
  );

  const structureNameSlug = normalizeForScope(input.structureName);
  const looksLikeSpecificMuscle =
    Boolean(explicitStructureSlug ?? explicitModelSelectionId) &&
    !structureNameSlug.startsWith("muschii-") &&
    !structureNameSlug.includes("muschii-");

  if (looksLikeSpecificMuscle) {
    return {
      structureSlug: explicitStructureSlug ?? explicitModelSelectionId ?? null,
      modelSelectionId: explicitModelSelectionId ?? explicitStructureSlug ?? null,
      bodyRegion: matchedScope?.bodyRegion ?? input.bodyRegion ?? null,
    };
  }

  if (!matchedScope) {
    return {
      structureSlug: explicitStructureSlug ?? null,
      modelSelectionId: explicitModelSelectionId ?? null,
      bodyRegion: input.bodyRegion ?? null,
    };
  }

  return {
    structureSlug: matchedScope.structureSlug,
    modelSelectionId: matchedScope.structureSlug,
    bodyRegion: matchedScope.bodyRegion,
  };
}

function splitSentences(value: string | undefined, fallback: string[] = []) {
  if (!value) return fallback;
  return value
    .split(/;|\.\s+/)
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, 5);
}

async function resolveExistingStructureSlug(
  supabase: ReturnType<typeof createUserSupabaseClient>,
  scope: SelectionScope,
) {
  const candidates = [scope.structureSlug, scope.modelSelectionId].filter(
    (value): value is string => Boolean(value),
  );

  for (const slug of candidates) {
    const { data, error } = await supabase
      .from("anatomy_structures")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data?.slug) return data.slug;
  }

  if (scope.modelSelectionId) {
    const { data, error } = await supabase
      .from("anatomy_structures")
      .select("slug")
      .eq("model_selection_id", scope.modelSelectionId)
      .maybeSingle();

    if (!error && data?.slug) return data.slug;
  }

  return null;
}

async function getFallbackAnatomyContext(
  supabase: ReturnType<typeof createUserSupabaseClient>,
  input: z.infer<typeof InputSchema>,
  scope: SelectionScope,
  structureSlug: string | null,
): Promise<KnowledgeEntry[]> {
  let query = supabase
    .from("anatomy_structures")
    .select(
      "id, slug, name_ro, common_name_ro, scientific_name_ro, display_name_ro, subtitle_name, description_ro, function_ro",
    )
    .eq("tissue", input.tissue)
    .limit(1);

  if (structureSlug) {
    query = query.eq("slug", structureSlug);
  } else if (scope.modelSelectionId) {
    query = query.eq("model_selection_id", scope.modelSelectionId);
  } else if (scope.bodyRegion) {
    query = query.eq("body_region", scope.bodyRegion);
  } else {
    return [];
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return [];

  return [
    {
      id: data.id,
      tissue: input.tissue,
      structure_slug: data.slug,
      model_selection_id: scope.modelSelectionId,
      body_region: scope.bodyRegion,
      category: "anatomie",
      title_ro: `Context anatomic: ${displayNameFromRow(data, data.name_ro)}`,
      content_ro: [
        data.description_ro,
        data.function_ro ? `Funcție principală: ${data.function_ro}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      priority: 5,
    },
  ];
}

function displayNameFromRow(row: Record<string, unknown> | null | undefined, fallback: string) {
  const displayName = textFromRow(row, "display_name_ro");
  if (displayName) return displayName;

  const commonName = textFromRow(row, "common_name_ro");
  const scientificName = textFromRow(row, "scientific_name_ro");
  if (commonName && scientificName) return commonName;
  if (commonName) return commonName;

  return textFromRow(row, "name_ro") ?? fallback;
}

function subtitleFromRow(row: Record<string, unknown> | null | undefined) {
  return (
    textFromRow(row, "subtitle_name") ??
    textFromRow(row, "scientific_name_ro") ??
    textFromRow(row, "latin_name") ??
    textFromRow(row, "name_latin") ??
    textFromRow(row, "english_name")
  );
}

function textFromRow(row: Record<string, unknown> | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isMissingStructuredStateColumn(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : String(error ?? "");

  return (
    message.includes("structured_state") &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

async function createAiConversation({
  supabase,
  userId,
  structureSlug,
  scope,
  aiInput,
  route,
}: {
  supabase: ReturnType<typeof createUserSupabaseClient>;
  userId: string;
  structureSlug: string | null;
  scope: SelectionScope;
  aiInput: z.infer<typeof InputSchema>;
  route: AiRoute;
}) {
  const insertPayload = {
    user_id: userId,
    structure_slug: structureSlug,
    model_selection_id: scope.modelSelectionId,
    tissue: aiInput.tissue,
    title: buildConversationTitle(aiInput, route),
  };

  const { data: conversation, error } = await supabase
    .from("ai_conversations")
    .insert(insertPayload)
    .select("id, structured_state")
    .single();

  if (!error && conversation) {
    return {
      id: conversation.id as string,
      structuredState: (conversation as { structured_state?: unknown }).structured_state ?? {},
      structuredStateAvailable: true,
    };
  }

  if (!isMissingStructuredStateColumn(error)) {
    throw new Error(error?.message ?? "Nu am putut crea conversația AI.");
  }

  console.warn("ai_conversations.structured_state is missing; continuing with empty AI state.");
  const fallback = await supabase
    .from("ai_conversations")
    .insert(insertPayload)
    .select("id")
    .single();

  if (fallback.error || !fallback.data) {
    throw new Error(fallback.error?.message ?? "Nu am putut crea conversația AI.");
  }

  return {
    id: fallback.data.id as string,
    structuredState: {},
    structuredStateAvailable: false,
  };
}

async function loadAiConversationState(
  supabase: ReturnType<typeof createUserSupabaseClient>,
  conversationId: string,
) {
  const { data: conversation, error } = await supabase
    .from("ai_conversations")
    .select("id, structured_state")
    .eq("id", conversationId)
    .single();

  if (!error && conversation) {
    return {
      structuredState: (conversation as { structured_state?: unknown }).structured_state ?? {},
      structuredStateAvailable: true,
    };
  }

  if (!isMissingStructuredStateColumn(error)) {
    throw new Error(error?.message ?? "Nu am putut încărca conversația AI.");
  }

  console.warn("ai_conversations.structured_state is missing; loading conversation without persisted AI state.");
  const fallback = await supabase.from("ai_conversations").select("id").eq("id", conversationId).single();
  if (fallback.error || !fallback.data) {
    throw new Error(fallback.error?.message ?? "Nu am putut încărca conversația AI.");
  }

  return { structuredState: {}, structuredStateAvailable: false };
}

async function updateAiConversationState({
  supabase,
  conversationId,
  symptomState,
  structuredStateAvailable,
}: {
  supabase: ReturnType<typeof createUserSupabaseClient>;
  conversationId: string;
  symptomState: SymptomState;
  structuredStateAvailable: boolean;
}) {
  const payload = structuredStateAvailable
    ? {
        updated_at: new Date().toISOString(),
        structured_state: toPersistableState(symptomState as unknown as Record<string, unknown>),
      }
    : {
        updated_at: new Date().toISOString(),
      };

  const { error } = await supabase.from("ai_conversations").update(payload).eq("id", conversationId);
  if (error && isMissingStructuredStateColumn(error)) {
    console.warn("ai_conversations.structured_state is missing; saved conversation timestamp only.");
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    return;
  }

  if (error) throw new Error(error.message);
}

async function resolveStructureDisplayNameForAi(
  supabase: ReturnType<typeof createUserSupabaseClient>,
  input: z.infer<typeof InputSchema>,
  scope: SelectionScope,
  structureSlug: string | null,
) {
  const candidates = [structureSlug, scope.modelSelectionId, scope.structureSlug].filter(
    (value): value is string => Boolean(value),
  );

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("anatomy_structures")
      .select(
        "slug, name_ro, common_name_ro, scientific_name_ro, display_name_ro, subtitle_name, english_name, latin_name, name_latin",
      )
      .or(`slug.eq.${candidate},model_selection_id.eq.${candidate}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) return displayNameFromRow(data, input.structureName);
  }

  const normalizedInputName = input.structureName.trim();
  if (normalizedInputName) {
    const { data, error } = await supabase
      .from("anatomy_structures")
      .select(
        "slug, name_ro, common_name_ro, scientific_name_ro, display_name_ro, subtitle_name, english_name, latin_name, name_latin",
      )
      .ilike("english_name", `%${normalizedInputName}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) return displayNameFromRow(data, input.structureName);
  }

  return input.structureName;
}

async function getSelectionContext(
  supabase: ReturnType<typeof createUserSupabaseClient>,
  input: z.infer<typeof InputSchema>,
  scope: SelectionScope,
  structureSlug: string | null,
  route: AiRoute,
) {
  const exactFirst = route.category === "selection_specific";
  const { data: exactData, error: exactError } = await supabase.rpc(
    "get_ai_context_for_selection",
    {
      p_tissue: input.tissue,
      p_model_selection_id: scope.modelSelectionId,
      p_structure_slug: structureSlug,
      p_body_region: exactFirst ? null : scope.bodyRegion,
      p_limit: exactFirst ? 8 : 12,
    },
  );

  if (exactError) {
    throw new Error(exactError.message);
  }

  const exactContext = (exactData ?? []) as KnowledgeEntry[];
  if (exactContext.length || !exactFirst) {
    return exactContext.length
      ? exactContext
      : await getFallbackAnatomyContext(supabase, input, scope, structureSlug);
  }

  const fallbackContext = await getFallbackAnatomyContext(supabase, input, scope, structureSlug);
  if (fallbackContext.length) return fallbackContext;

  const { data: regionalData, error: regionalError } = await supabase.rpc(
    "get_ai_context_for_selection",
    {
      p_tissue: input.tissue,
      p_model_selection_id: scope.modelSelectionId,
      p_structure_slug: structureSlug,
      p_body_region: scope.bodyRegion,
      p_limit: 12,
    },
  );

  if (regionalError) {
    throw new Error(regionalError.message);
  }

  return (regionalData ?? []) as KnowledgeEntry[];
}

function contextScore(entry: KnowledgeEntry, route: AiRoute) {
  const searchable = normalizeText(
    [
      entry.title_ro,
      entry.content_ro,
      entry.body_region,
      entry.structure_slug,
      entry.model_selection_id,
      entry.category,
    ]
      .filter(Boolean)
      .join(" "),
  );
  let score = entry.priority ?? 1;

  if (route.entities.bodyRegion && entry.body_region === route.entities.bodyRegion) score += 8;
  if (
    route.category === "red_flag_or_urgent" &&
    ["semne_alarma", "triage_rule", "triaj"].includes(entry.category)
  )
    score += 10;
  if (
    route.category === "symptom_or_injury" &&
    ["simptome", "cauze_posibile", "intrebari_clarificare", "recomandari"].includes(entry.category)
  )
    score += 5;

  for (const keyword of route.entities.keywords) {
    const plainKeyword = keyword.replace(/-/g, " ");
    if (searchable.includes(plainKeyword) || searchable.includes(keyword)) score += 2;
  }

  return score;
}

function rankContext(context: KnowledgeEntry[], route: AiRoute, limit = 16) {
  const seen = new Set<string>();
  return context
    .map((entry) => ({ entry, score: contextScore(entry, route) }))
    .filter(({ entry, score }) => score > (entry.priority ?? 1))
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry)
    .filter((entry) => {
      const key = `${entry.title_ro}:${entry.content_ro}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function makeVirtualContext(
  source: string,
  category: string,
  title: string,
  content: string,
  priority = 4,
): KnowledgeEntry {
  return {
    id: `${source}:${normalizeForScope(title).slice(0, 80)}`,
    category,
    title_ro: title,
    content_ro: content,
    priority,
    tissue: undefined,
    structure_slug: null,
    model_selection_id: null,
    body_region: null,
  };
}

async function safeSelect<T>(
  query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function getGeneralMedicalContext(
  supabase: ReturnType<typeof createUserSupabaseClient>,
  input: z.infer<typeof InputSchema>,
  route: AiRoute,
  selectionContext: KnowledgeEntry[],
): Promise<KnowledgeEntry[]> {
  const ragCategories =
    route.category === "red_flag_or_urgent"
      ? ["semne_alarma", "intrebari_clarificare"]
      : route.category === "symptom_or_injury"
        ? ["simptome", "cauze_posibile", "recomandari", "semne_alarma", "intrebari_clarificare"]
        : null;
  const ragTags = unique(
    [
      ...route.entities.symptoms,
      ...route.entities.contexts,
      route.entities.bodyRegionKey ?? "",
      route.entities.severity ?? "",
      route.entities.duration ?? "",
    ].map(normalizeForScope),
  );
  const ragFilters: RetrievalFilters = {
    aiLayer: input.aiLayer ?? (input.tissue === "organ" ? "organs" : input.tissue === "muschi" ? "muscular" : "skeleton"),
    tissue: input.tissue,
    bodyRegion: route.entities.bodyRegion ?? input.bodyRegion ?? null,
    structureSlug: route.selectedSubjectMentioned
      ? (input.structureSlug ?? null)
      : (route.targetStructureSlug ?? input.structureSlug ?? null),
    categories: ragCategories,
    tags: ragTags.length ? ragTags : null,
    limit: route.category === "red_flag_or_urgent" ? 20 : 16,
    matchThreshold: 0.68,
  };
  const ragRows = await hybridSearchKnowledge(supabase as never, input.question, ragFilters);

  const symptomsRows = await safeSelect<{
    id: string;
    slug: string;
    name_ro: string;
    description_ro?: string | null;
    keywords_ro?: string[] | null;
    red_flag?: boolean | null;
  }>(
    supabase
      .from("symptoms")
      .select("id, slug, name_ro, description_ro, keywords_ro, red_flag")
      .limit(80),
  );

  const conditionRows = await safeSelect<{
    id: string;
    slug: string;
    name_ro: string;
    name_en?: string | null;
    medical_name?: string | null;
    medical_name_en?: string | null;
    tissue?: string | null;
    default_level?: string | null;
    description_ro?: string | null;
    description_en?: string | null;
    educational_note_ro?: string | null;
    educational_note_en?: string | null;
    condition_category?: string | null;
    aliases_ro?: string[] | null;
    aliases_en?: string[] | null;
    keywords_ro?: string[] | null;
    keywords_en?: string[] | null;
    typical_duration_ro?: string | null;
    typical_duration_en?: string | null;
    common_causes_ro?: string | null;
    common_causes_en?: string | null;
    self_care_ro?: string | null;
    self_care_en?: string | null;
    doctor_when_ro?: string | null;
    doctor_when_en?: string | null;
    emergency_signs_ro?: string | null;
    emergency_signs_en?: string | null;
    prevention_ro?: string | null;
    prevention_en?: string | null;
    icd10_code?: string | null;
    triage_priority?: number | null;
    active?: boolean | null;
    review_status?: string | null;
  }>(
    supabase
      .from("conditions")
      .select("*")
      .limit(120),
  );

  const triageQuestionRows = await safeSelect<{
    id: string;
    slug: string;
    tissue?: string | null;
    body_region?: string | null;
    question_ro: string;
  }>(
    supabase
      .from("triage_questions")
      .select("id, slug, tissue, body_region, question_ro")
      .eq("active", true)
      .limit(40),
  );

  const triageRuleRows = await safeSelect<{
    id: string;
    slug: string;
    name_ro: string;
    tissue?: string | null;
    body_region?: string | null;
    level?: string | null;
    explanation_ro: string;
  }>(
    supabase
      .from("triage_rules")
      .select("id, slug, name_ro, tissue, body_region, level, explanation_ro")
      .limit(40),
  );

  const optionalTables = await Promise.all([
    safeSelect<Record<string, unknown>>(supabase.from("body_regions").select("*").limit(60)),
    safeSelect<Record<string, unknown>>(supabase.from("movement_patterns").select("*").limit(60)),
    safeSelect<Record<string, unknown>>(
      supabase.from("pain_classifications").select("*").limit(60),
    ),
    safeSelect<Record<string, unknown>>(supabase.from("muscles").select("*").limit(80)),
    safeSelect<Record<string, unknown>>(supabase.from("organs").select("*").limit(80)),
  ]);

  const optionalContext = optionalTables.flatMap((rows, tableIndex) => {
    const tableNames = ["body_regions", "movement_patterns", "pain_classifications", "muscles", "organs"];
    return rows.map((row, index) => {
      const values = Object.entries(row)
        .filter(
          ([, value]) =>
            typeof value === "string" || typeof value === "number" || typeof value === "boolean",
        )
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join("; ");
      return makeVirtualContext(
        tableNames[tableIndex],
        tableNames[tableIndex],
        `Date Santix: ${tableNames[tableIndex]} #${index + 1}`,
        values,
        3,
      );
    });
  });

  const symptomContext = symptomsRows.map((row) =>
    makeVirtualContext(
      "symptoms",
      row.red_flag ? "semne_alarma" : "simptome",
      `Simptom: ${row.name_ro}`,
      [
        row.description_ro,
        row.keywords_ro?.length ? `Cuvinte cheie: ${row.keywords_ro.join(", ")}` : "",
        row.red_flag ? "Acest simptom este marcat ca semn de alarmă." : "",
      ]
        .filter(Boolean)
        .join(" "),
      row.red_flag ? 8 : 5,
    ),
  );

  const conditionContext = conditionRows
    .filter((row) => row.active !== false && row.review_status !== "archived")
    .map((row) =>
      makeVirtualContext(
        "conditions",
        "cauze_posibile",
        `Afecțiune posibilă: ${row.name_ro}`,
        [
          row.medical_name ? `Denumire medicală: ${row.medical_name}.` : "",
          row.medical_name_en ? `Medical name EN: ${row.medical_name_en}.` : "",
          row.name_en ? `Denumire EN: ${row.name_en}.` : "",
          row.condition_category ? `Categorie: ${row.condition_category}.` : "",
          row.default_level ? `Nivel implicit: ${row.default_level}.` : "",
          row.triage_priority ? `Prioritate triaj: ${row.triage_priority}.` : "",
          row.aliases_ro?.length ? `Aliasuri RO: ${row.aliases_ro.join(", ")}.` : "",
          row.aliases_en?.length ? `Aliases EN: ${row.aliases_en.join(", ")}.` : "",
          row.keywords_ro?.length ? `Cuvinte cheie RO: ${row.keywords_ro.join(", ")}.` : "",
          row.keywords_en?.length ? `Keywords EN: ${row.keywords_en.join(", ")}.` : "",
          row.description_ro,
          row.description_en,
          row.typical_duration_ro ? `Durată tipică: ${row.typical_duration_ro}` : "",
          row.typical_duration_en ? `Typical duration: ${row.typical_duration_en}` : "",
          row.common_causes_ro ? `Cauze frecvente: ${row.common_causes_ro}` : "",
          row.common_causes_en ? `Common causes: ${row.common_causes_en}` : "",
          row.self_care_ro ? `Îngrijire inițială: ${row.self_care_ro}` : "",
          row.self_care_en ? `Initial self-care: ${row.self_care_en}` : "",
          row.doctor_when_ro ? `Când se recomandă medic: ${row.doctor_when_ro}` : "",
          row.doctor_when_en ? `When to seek medical care: ${row.doctor_when_en}` : "",
          row.emergency_signs_ro ? `Semne de urgență: ${row.emergency_signs_ro}` : "",
          row.emergency_signs_en ? `Emergency signs: ${row.emergency_signs_en}` : "",
          row.prevention_ro ? `Prevenție: ${row.prevention_ro}` : "",
          row.prevention_en ? `Prevention: ${row.prevention_en}` : "",
          row.icd10_code ? `ICD-10: ${row.icd10_code}.` : "",
          row.educational_note_ro,
          row.educational_note_en,
        ]
          .filter(Boolean)
          .join(" "),
        row.triage_priority ?? (row.default_level === "consultare_doctor" ? 7 : 5),
      ),
    );

  const triageQuestionContext = triageQuestionRows.map((row) =>
    makeVirtualContext(
      "triage_questions",
      "intrebari_clarificare",
      `Întrebare de triaj: ${row.slug}`,
      row.question_ro,
      5,
    ),
  );

  const triageRuleContext = triageRuleRows.map((row) =>
    makeVirtualContext(
      "triage_rules",
      "triage_rule",
      `Regulă de triaj: ${row.name_ro}`,
      [row.level ? `Nivel: ${row.level}.` : "", row.explanation_ro].filter(Boolean).join(" "),
      row.level === "consultare_doctor" ? 9 : 6,
    ),
  );

  const broadContext = [
    ...ragRows.map((entry) => ({
      ...entry,
      title_ro: `${entry.retrieval_source === "semantic" ? "Rezultat semantic" : "Rezultat keyword"}: ${entry.title_ro}`,
      priority: Math.min(10, (entry.priority ?? 4) + 2),
    })),
    ...symptomContext,
    ...conditionContext,
    ...triageQuestionContext,
    ...triageRuleContext,
    ...optionalContext,
    ...selectionContext.map((entry) => ({
      ...entry,
      title_ro: `Indiciu din selecția 3D: ${entry.title_ro}`,
      priority: Math.max(1, entry.priority - 2),
    })),
  ];

  return rankContext(broadContext, route, route.category === "red_flag_or_urgent" ? 20 : 16);
}

async function getGuardrailContext(
  supabase: ReturnType<typeof createUserSupabaseClient>,
  lang: "ro" | "en" = "ro",
): Promise<KnowledgeEntry[]> {
  type GuardrailRow = {
    id: string;
    name: string;
    instruction_ro: string;
    instruction_en: string | null;
    severity_level: "low" | "medium" | "critical";
    fallback_message_ro: string | null;
    fallback_message_en: string | null;
    category: "safety" | "clinical" | "formatting";
  };

  const rows = await safeSelect<GuardrailRow>(
    supabase
      .from("ai_guardrails")
      .select(
        "id, name, instruction_ro, instruction_en, severity_level, fallback_message_ro, fallback_message_en, category",
      )
      .eq("active", true)
      .in("category", ["safety", "clinical"])
      .limit(20),
  );

  return rows.map((row) => {
    const instruction = lang === "en" ? (row.instruction_en || row.instruction_ro) : row.instruction_ro;
    const title =
      lang === "en"
        ? `Santix ${row.category} rule: ${row.name}`
        : `Regulă Santix ${row.category}: ${row.name}`;

    return {
      ...makeVirtualContext(
        "ai_guardrails",
        "guardrail",
        title,
        instruction,
        10,
      ),
      id: row.id,
      metadata: {
        name: row.name,
        severity_level: row.severity_level,
        category: row.category,
        fallback_message_ro: row.fallback_message_ro,
        fallback_message_en: row.fallback_message_en,
      },
    };
  });
}

function getCriticalGuardrailFallback(
  context: KnowledgeEntry[],
  ruleName: string,
  lang: "ro" | "en" = "ro",
) {
  const guardrail = context.find(
    (entry) =>
      entry.category === "guardrail" &&
      entry.metadata?.name === ruleName &&
      entry.metadata?.severity_level === "critical",
  );

  const fallback =
    lang === "en"
      ? guardrail?.metadata?.fallback_message_en
      : guardrail?.metadata?.fallback_message_ro;

  return typeof fallback === "string" && fallback.trim() ? fallback.trim() : null;
}

function isVaguePainQuestion(question: string) {
  const normalized = stripPunctuation(question);
  return PAIN_STARTER_TERMS.some((term) => normalized.includes(term));
}

function isAmbiguousShortReply(question: string) {
  const normalized = stripPunctuation(question);
  return (
    ["ok", "okay", "niciuna", "nici una", "nu stiu", "nush"].includes(normalized) ||
    isContextualAffirmative(normalized) ||
    isContextualNegative(normalized)
  );
}

function buildUnclearAnswer(input: z.infer<typeof InputSchema>, symptomState: SymptomState, lang: "ro" | "en" = "ro") {
  if (
    (isAmbiguousShortReply(input.question) || isContextualReply(input.question, symptomState)) &&
    symptomState.last_question_intent
  ) {
    return buildClarifyingAnswer(input, symptomState, lang);
  }

  if (lang === "en") {
    const region = input.bodyRegion
      ? ` or pain in the ${input.bodyRegion} area`
      : " or pain in the selected area";
    return `I didn't quite understand. Are you asking about ${input.structureName}${region}?`;
  }
  const region = input.bodyRegion
    ? ` sau la o durere în zona ${input.bodyRegion}`
    : " sau la o durere în zona selectată";
  return `Nu am înțeles exact întrebarea. Te referi la ${input.structureName}${region}?`;
}

function buildStructureClarificationAnswer(input: z.infer<typeof InputSchema>, lang: "ro" | "en" = "ro") {
  const structure = input.structureName;
  const region = normalizeForScope(input.bodyRegion);

  if (region.includes("brat") || normalizeForScope(structure).includes("humerus")) {
    return lang === "en"
      ? `I see, you're referring to ${structure}. Is the pain closer to the shoulder, mid-arm, or toward the elbow?`
      : `Înțeleg, te referi la ${structure}. Durerea este mai aproape de umăr, la mijlocul brațului sau spre cot?`;
  }

  if (
    region.includes("coapsa") ||
    region.includes("membru-inferior") ||
    normalizeForScope(structure).includes("femur")
  ) {
    return lang === "en"
      ? `I see, you're referring to ${structure}. Is the pain closer to the hip, mid-thigh, or toward the knee?`
      : `Înțeleg, te referi la ${structure}. Durerea este mai aproape de șold, la mijloc sau spre genunchi?`;
  }

  return lang === "en"
    ? `I see, you're referring to ${structure}. Is the pain closer to the upper joint, in the middle, or toward the lower joint?`
    : `Înțeleg, te referi la ${structure}. Durerea este mai aproape de articulația de sus, la mijloc sau spre articulația de jos?`;
}

function buildContextSwitchAnswer(
  input: z.infer<typeof InputSchema>,
  contextSwitch: ContextSwitchAction,
  lang: "ro" | "en" = "ro",
) {
  const en = lang === "en";

  if (
    contextSwitch.selected_context_fit === "likely_muscular_but_bone_selected" &&
    !contextSwitch.should_switch_context
  ) {
    return en
      ? "Pain during exertion may be related to the arm muscles. Does the pain occur mainly when you tense or lift your arm, or also at rest?"
      : "Durerea la încordare poate avea legătură cu mușchii brațului. Durerea apare mai ales când încordezi sau ridici brațul, ori și în repaus?";
  }

  if (
    contextSwitch.selected_context_fit === "likely_bone_joint_but_muscle_selected" &&
    !contextSwitch.should_switch_context
  ) {
    return en
      ? "Although you selected a muscle, pain after a fall or deep pain may also involve the bone or joint. Is there swelling/deformity, or can you move the area normally?"
      : "Deși ai selectat un mușchi, durerea după căzătură sau durerea profundă poate implica și osul ori articulația. Ai umflătură/deformare sau poți mișca zona normal?";
  }

  if (contextSwitch.should_switch_context && contextSwitch.target_layer === "muscular") {
    return en
      ? "From what you describe, it seems more useful to also check the muscular area. Switching to Muscular System. Did it appear after exertion or sport?"
      : "Din ce descrii, pare mai util să verificăm și zona musculară. Te mut pe Sistem Muscular. A apărut după efort sau sport?";
  }

  if (contextSwitch.should_switch_context && contextSwitch.target_layer === "organs") {
    const organLabel =
      ORGAN_CONTEXT_TARGETS.find((target) => target.slug === contextSwitch.target_structure_slug)
        ?.label ?? (en ? "the mentioned organ" : "organul menționat");
    return en
      ? `The question seems to be about ${organLabel}. Switching to Organs. Where do you feel the pain, how severe is it, and did it appear suddenly or gradually?`
      : `Întrebarea pare despre ${organLabel}. Te mut pe Organe. Unde simți durerea, cât de severă este și a apărut brusc sau treptat?`;
  }

  if (contextSwitch.should_switch_context && contextSwitch.target_layer === "skeleton") {
    const urgentPrefix = contextSwitch.selected_context_fit === "red_flag_priority"
      ? en
        ? "If the pain is severe, there is deformity, numbness, or you cannot move/support the area, consult a doctor urgently. "
        : "Dacă durerea este severă, există deformare, amorțeală sau nu poți mișca/sprijini zona, consultă urgent un medic. "
      : "";
    return en
      ? `${urgentPrefix}Although you selected a muscle, the description may also involve the bone or joint. Switching to Skeleton. Is there swelling, deformity, or difficulty moving?`
      : `${urgentPrefix}Deși ai selectat un mușchi, descrierea poate implica și osul sau articulația. Te mut pe Schelet. Ai umflătură, deformare sau dificultate la mișcare?`;
  }

  if (
    contextSwitch.should_switch_context &&
    contextSwitch.selected_context_fit === "different_body_region_detected"
  ) {
    const region = contextSwitch.target_body_region ?? (en ? "the mentioned area" : "zona menționată");
    return en
      ? `Your question is about ${region}, not the current selection, so I'm switching context. Does the pain occur only with movement or also at rest?`
      : `Întrebarea ta este despre ${region}, nu despre selecția curentă, așa că schimb contextul. Durerea apare doar la mișcare sau și în repaus?`;
  }

  return en
    ? "Did the pain appear after an impact/fall or more after exertion/strain?"
    : "Durerea a apărut după lovitură/căzătură sau mai mult după efort/încordare?";
}

export function buildClarifyingAnswer(
  input: z.infer<typeof InputSchema>,
  symptomState: SymptomState,
  lang: "ro" | "en" = "ro",
) {
  const en = lang === "en";

  if (input.tissue === "organ") {
    if (symptomState.next_step === "urgent" || symptomState.red_flags_detected) {
      const reasons = symptomState.red_flag_reasons.length
        ? ` (${symptomState.red_flag_reasons.join(", ")})`
        : "";
      return en
        ? `What you describe may be a warning sign${reasons}. Urgent medical consultation is recommended. If symptoms are intense, you have breathing difficulties, chest pain, fainting, confusion, or blood in urine/stool/vomit, go to the emergency room.`
        : `Ce descrii poate fi un semn de alarmă${reasons}. Este recomandat consult medical urgent, iar dacă simptomele sunt intense, apar dificultăți de respirație, durere în piept, leșin, confuzie sau sânge în urină/scaun/vărsături, mergi la urgență.`;
    }

    if (symptomState.last_question_intent === "organ_associated_signs") {
      const normalized = stripPunctuation(input.question);
      if (isContextualAffirmative(normalized) || isContextualNegative(normalized)) {
        return en
          ? `When you say "${input.question.trim()}", do you mean fever, nausea/vomiting, breathing difficulties, chest pain, or blood in urine/stool?`
          : `Când spui „${input.question.trim()}", te referi la febră, greață/vărsături, dificultăți de respirație, durere în piept sau sânge în urină/scaun?`;
      }
    }

    if (!isAnswered(symptomState, "severity")) {
      symptomState.last_question_intent = "organ_severity";
      return en
        ? "I'm sorry to hear you're in pain. Is the pain mild, moderate, or severe?"
        : "Îmi pare rău că te doare. Durerea este ușoară, moderată sau severă?";
    }

    if (!isAnswered(symptomState, "onset")) {
      symptomState.last_question_intent = "organ_onset";
      return en ? "Did it appear suddenly or gradually?" : "A apărut brusc sau treptat?";
    }

    if (!isAnswered(symptomState, "associated_signs")) {
      symptomState.last_question_intent = "organ_associated_signs";
      return en
        ? "Do you have fever, nausea, vomiting, breathing difficulties, chest pain, or blood in urine/stool?"
        : "Ai febră, greață, vărsături, dificultăți de respirație, durere în piept sau sânge în urină/scaun?";
    }

    return en
      ? [
          "I can continue educational guidance about the selected organ, without diagnosis.",
          "Monitor whether the pain worsens, becomes severe, or if fever, persistent vomiting, chest pain, breathing difficulties, or blood in urine/stool appear.",
          "For severe, sudden, or worsening symptoms, consult a doctor.",
        ].join("\n")
      : [
          "Pot continua orientarea educațională despre organul selectat, fără diagnostic.",
          "Urmărește dacă durerea se agravează, devine severă sau apar febră, vărsături persistente, durere în piept, dificultăți de respirație ori sânge în urină/scaun.",
          "Pentru simptome severe, bruște sau în agravare, consultă un medic.",
        ].join("\n");
  }

  const region = normalizeForScope(input.bodyRegion);
  const urgentRegion = en
    ? region.includes("brat") ? "the arm appears deformed and you can't move it" : "the area is deformed and you can't move it"
    : region.includes("brat") ? "brațul pare deformat, nu îl poți mișca" : "zona este deformată, nu o poți mișca";
  const initialQuestion = en
    ? "I'm sorry to hear you're in pain. Did it appear after an impact/fall or more after exertion/strain?"
    : "Îmi pare rău că te doare. A apărut după lovitură/căzătură sau mai mult după efort/încordare?";

  if (symptomState.next_step === "urgent" || symptomState.movement_ok === "no") {
    return en
      ? `What you describe may be a warning sign. If the pain is severe, ${urgentRegion}, or numbness/weakness appears, consult a doctor urgently.`
      : `Ce descrii poate fi un semn de alarmă. Dacă durerea este severă, ${urgentRegion} sau apare amorțeală/slăbiciune, consultă urgent un medic.`;
  }

  if (symptomState.last_question_intent === "trauma_or_effort_and_movement") {
    const normalized = stripPunctuation(input.question);
    if (isContextualAffirmative(normalized) || isContextualNegative(normalized)) {
      return en
        ? `When you say "${input.question.trim()}", do you mean it appeared after an impact/fall/exertion, or that you can move the area normally?`
        : `Când spui „${input.question.trim()}", te referi că a apărut după lovitură/căzătură/efort sau că poți mișca zona normal?`;
    }
  }

  if (symptomState.trauma_or_effort === "yes" && symptomState.trauma_type === "unknown") {
    return en
      ? "I see. Was it more of an impact, a fall, or exertion?"
      : "Înțeleg. A fost mai degrabă o lovitură, o căzătură sau efort?";
  }

  switch (symptomState.next_step) {
    case "ask_trauma_or_effort":
      return initialQuestion;
    case "ask_onset":
      return en
        ? symptomState.trauma_or_effort === "no"
          ? "I see — so it didn't appear after an impact, fall, or exertion. Did it start suddenly or gradually?"
          : "I see. Did it start suddenly or gradually?"
        : symptomState.trauma_or_effort === "no"
          ? "Înțeleg — deci nu a apărut după lovitură, căzătură sau efort. A început brusc sau treptat?"
          : "Înțeleg. A început brusc sau treptat?";
    case "ask_movement":
      return en ? "I see. Can you move the area normally?" : "Înțeleg. Poți mișca zona normal?";
    case "ask_severity":
      if (symptomState.pain_quality !== "unknown") {
        return en
          ? `I see, the pain is ${painQualityLabel(symptomState.pain_quality, "en")}. In terms of intensity, is it mild, moderate, or very strong?`
          : `Înțeleg, durerea este ${painQualityLabel(symptomState.pain_quality, "ro")}. Ca intensitate, este ușoară, moderată sau foarte puternică?`;
      }
      return en
        ? symptomState.movement_ok === "yes"
          ? "Alright. Is the pain mild, moderate, or very strong?"
          : "Is the pain mild, moderate, or very strong?"
        : symptomState.movement_ok === "yes"
          ? "În regulă. Durerea este ușoară, moderată sau foarte puternică?"
          : "Durerea este ușoară, moderată sau foarte puternică?";
    case "ask_associated_signs":
      if (symptomState.movement_ok === "yes" && symptomState.severity === "severe") {
        return en
          ? "I see — you can move the area, but the pain is very strong. Have you noticed swelling, numbness, or weakness?"
          : "Înțeleg — poți mișca zona, dar durerea este foarte puternică. Ai observat umflătură, amorțeală sau slăbiciune?";
      }
      return en
        ? "Have you noticed swelling, numbness, or bruising?"
        : "Ai observat umflătură, amorțeală sau vânătaie?";
    case "ask_duration":
      if (
        symptomState.movement_ok === "yes" &&
        symptomState.swelling === "no" &&
        symptomState.numbness === "no" &&
        symptomState.bruising === "no"
      ) {
        return en
          ? "Alright. The fact that you can move the area and don't have these signs is more reassuring. How long have you been feeling the pain?"
          : "În regulă. Faptul că poți mișca zona și nu ai aceste semne este mai liniștitor. De cât timp simți durerea?";
      }
      return en ? "How long have you been feeling the pain?" : "De cât timp simți durerea?";
    case "recommend":
      return en
        ? [
            "I understand. From what you've described, the fact that you can move the area and have no swelling, numbness, or bruising is more reassuring.",
            "For now, monitor the pain progression and avoid movements that worsen it.",
            `If the pain intensifies, persists for several days, ${urgentRegion}, large swelling, numbness, or weakness appears, consult a doctor.`,
            "This response is informational and does not represent a diagnosis.",
          ].join("\n")
        : [
            "Înțeleg. Din ce ai descris până acum, faptul că poți mișca zona și nu ai umflătură, amorțeală sau vânătaie este mai liniștitor.",
            "Pentru moment, urmărește evoluția durerii și evită mișcările care o accentuează.",
            `Dacă durerea se intensifică, persistă mai multe zile, ${urgentRegion}, apare umflătură mare, amorțeală sau slăbiciune, consultă un medic.`,
            "Acest răspuns este informativ și nu reprezintă un diagnostic.",
          ].join("\n");
    default:
      return en
        ? [
            "I understand. From what you've described so far, I can continue educational guidance, without diagnosis.",
            "Monitor whether the pain changes, intensifies, or new signs appear.",
            `If the pain becomes severe, ${urgentRegion}, large swelling, numbness, or weakness appears, consult a doctor.`,
          ].join("\n")
        : [
            "Înțeleg. Din ce ai descris până acum, pot continua orientarea educațională, fără diagnostic.",
            "Urmărește dacă durerea se schimbă, se intensifică sau apar semne noi.",
            `Dacă durerea devine severă, ${urgentRegion}, apare umflătură mare, amorțeală sau slăbiciune, consultă un medic.`,
          ].join("\n");
  }
}

function buildFollowUpAnswer(input: z.infer<typeof InputSchema>, context: KnowledgeEntry[], lang: "ro" | "en" = "ro") {
  const en = lang === "en";
  const causes = en ? [] : splitSentences(findContext(context, "cauze_posibile")).slice(0, 4);
  const symptoms = en ? [] : splitSentences(findContext(context, "simptome")).slice(0, 4);
  const recommendations = en ? [] : splitSentences(findContext(context, "recomandari")).slice(0, 4);
  const redFlags = en ? [] : splitSentences(findContext(context, "semne_alarma")).slice(0, 4);

  const severe = en
    ? hasAny(input.question, ["severe", "unbearable", "can't move", "cannot move", "deform", "numb", "weakness", "snap", "fell", "hit", "blood"])
    : hasAny(input.question, ["sever", "insuportabil", "nu pot", "nu pot misca", "nu pot folosi", "deform", "amorteala", "slabiciune", "pocnet", "cazut", "lovitura", "sange"]);

  return formatSixSectionAnswer({
    summary: severe
      ? input.tissue === "organ"
        ? en
          ? `For ${input.structureName}, the description includes signs that may require medical evaluation, especially if sudden, severe, or associated with breathing difficulties, chest pain, or blood in urine/stool.`
          : `Pentru ${input.structureName}, descrierea include semne care pot necesita evaluare medicală, mai ales dacă sunt bruște, severe sau asociate cu respirație dificilă, durere în piept ori sânge în urină/scaun.`
        : en
          ? `For ${input.structureName}, the description includes signs that may require medical evaluation, especially if they appeared after trauma or you cannot use the area.`
          : `Pentru ${input.structureName}, descrierea include semne care pot necesita evaluare medicală, mai ales dacă au apărut după traumatism sau nu poți folosi zona.`
      : en
        ? `For ${input.structureName}, I can provide educational guidance based on Santix data, without a final diagnosis.`
        : `Pentru ${input.structureName}, pot orienta educațional răspunsul pe baza datelor Santix, fără diagnostic final.`,
    causes,
    aggravators: symptoms.length
      ? symptoms
      : [en
          ? "Increased intensity, swelling, bruising, functional limitation, or worsening over time may indicate a more significant problem."
          : "Intensitatea crescută, umflarea, vânătaia, limitarea funcțională sau agravarea în timp pot indica o problemă mai importantă."],
    safeActions: recommendations.length
      ? recommendations
      : [en ? "Avoid straining the painful area and monitor symptom progression." : "Evită solicitarea zonei dureroase și urmărește evoluția simptomelor."],
    consult: redFlags.length
      ? redFlags
      : input.tissue === "organ"
        ? [en
            ? "Consult a doctor urgently for chest pain, breathing difficulties, severe abdominal pain, fainting, confusion, or blood in urine/stool/vomit."
            : "Consultă urgent un medic pentru durere în piept, dificultăți de respirație, durere abdominală severă, leșin, confuzie sau sânge în urină/scaun/vărsături."]
        : [en
            ? "Consult a doctor for severe pain, deformity, numbness, weakness, or inability to use the area."
            : "Consultă un medic pentru durere severă, deformare, amorțeală, slăbiciune sau imposibilitate de folosire."],
  }, lang);
}

function buildSelectionSpecificAnswer(
  input: z.infer<typeof InputSchema>,
  context: KnowledgeEntry[],
  lang: "ro" | "en" = "ro",
) {
  const en = lang === "en";
  const anatomy = en ? [] : splitSentences(findContext(context, "anatomie")).slice(0, 3);
  const recommendations = en ? [] : splitSentences(findContext(context, "recomandari")).slice(0, 2);
  const symptoms = en ? [] : splitSentences(findContext(context, "simptome")).slice(0, 2);

  return formatSixSectionAnswer({
    summary: en
      ? `${input.structureName} is the subject of the current selection.`
      : `${input.structureName} este subiectul selecției curente.`,
    causes: anatomy.length
      ? anatomy
      : [en
          ? `It is a structure of type ${input.tissue}, included in the Santix model for the selected region.`
          : `Este o structură de tip ${input.tissue}, încadrată în modelul Santix pentru regiunea selectată.`],
    aggravators: symptoms.length
      ? symptoms
      : [en
          ? "Santix data does not indicate specific aggravating factors for this structure."
          : "Datele Santix nu indică factori agravanți specifici pentru această structură."],
    safeActions: recommendations.length
      ? recommendations
      : input.tissue === "organ"
        ? [en
            ? "Use this information as educational guidance and monitor associated general symptoms, without self-diagnosis."
            : "Folosește informația ca orientare educațională și urmărește simptomele generale asociate, fără autodiagnostic."]
        : [en
            ? "Use this information as educational guidance and avoid overloading the area if pain occurs."
            : "Folosește informația ca orientare educațională și evită suprasolicitarea zonei dacă apare durere."],
    consult: [en
      ? "Consult a doctor if the pain is severe, persists, worsens, or warning signs appear."
      : "Consultă un medic dacă durerea este severă, persistă, se agravează sau apar semnale de alarmă."],
  }, lang);
}

function buildOutOfScopeAnswer(lang: "ro" | "en" = "ro") {
  return lang === "en"
    ? "I can only help with questions related to health, the body, pain, recovery, anatomy, or Santix features in this domain. Please rephrase your question in the medical/educational area."
    : "Pot ajuta doar cu întrebări legate de sănătate, corp, durere, recuperare, anatomie sau funcțiile Santix din acest domeniu. Reformulează te rog întrebarea în zona medicală/educațională.";
}

function buildAppSpecificAnswer(context: KnowledgeEntry[], lang: "ro" | "en" = "ro") {
  if (context.length === 0) {
    return lang === "en"
      ? "I don't have enough information in the Santix database about this aspect of the application. I won't invent services, prices, subscriptions or features that are not documented."
      : "Nu am informații suficiente în baza Santix despre acest aspect al aplicației. Nu vreau să inventez servicii, prețuri, abonamente sau funcții care nu sunt documentate.";
  }

  if (lang === "en") {
    return "I can only answer based on available Santix information. Please ask a specific question about the selected structure and I will do my best to help.";
  }
  return [
    "Pot răspunde doar pe baza informațiilor Santix disponibile:",
    "",
    ...context.slice(0, 4).map((entry, index) => `${index + 1}. ${entry.content_ro}`),
  ].join("\n");
}

function buildGeneralMedicalFallback(
  input: z.infer<typeof InputSchema>,
  route: AiRoute,
  context: KnowledgeEntry[],
  lang: "ro" | "en" = "ro",
) {
  const en = lang === "en";
  const redFlags = unique([
    ...route.entities.redFlags,
    ...splitSentences(findContext(context, "semne_alarma"), [
      "deformare vizibilă",
      "durere severă",
      "amorțeală sau slăbiciune",
      "imposibilitatea de a mișca sau sprijini zona",
    ]),
  ]).slice(0, 5);
  const hasTraumaContext = route.entities.contexts.some((item) =>
    ["căzătură", "lovitură", "sport"].includes(item),
  );
  const hasMovementPain =
    route.entities.symptoms.includes("limitare de mișcare") ||
    hasAny(input.question, ["miscare", "misc", "ridic", "indoi", "alerg", "merg"]);
  const questions = input.tissue === "organ"
    ? en
      ? ["Where do you feel the pain or discomfort?", "Is it mild, moderate, or severe, and did it appear suddenly or gradually?", "Do you have fever, nausea, vomiting, breathing difficulties, chest pain, or blood in urine/stool?"]
      : ["Unde simți durerea sau disconfortul?", "Este ușoară, moderată sau severă și a apărut brusc sau treptat?", "Ai febră, greață, vărsături, dificultăți de respirație, durere în piept sau sânge în urină/scaun?"]
    : hasTraumaContext
    ? en
      ? ["How severe is the pain: mild, moderate, or severe?", "Is there deformity, numbness, weakness, or can you move the area normally?"]
      : ["Cât de severă este durerea: ușoară, moderată sau severă?", "Ai deformare, amorțeală, slăbiciune sau nu poți mișca zona normal?"]
    : hasMovementPain
      ? en
        ? ["What movement worsens the pain?", "Does the pain occur only with movement or also at rest?"]
        : ["Ce mișcare accentuează durerea?", "Durerea apare doar la mișcare sau și în repaus?"]
      : en
        ? ["When did the pain appear?", "Is it mild, moderate, or severe?"]
        : ["Când a apărut durerea?", "Este ușoară, moderată sau severă?"];

  const urgentIntro =
    route.category === "red_flag_or_urgent"
      ? input.tissue === "organ"
        ? en
          ? "What you describe may include warning signs. Prompt medical consultation is recommended. For chest pain, breathing difficulties, severe abdominal pain, fainting, confusion, or blood in urine/stool/vomit, go to the emergency room."
          : "Ce descrii poate include semne de alarmă. Este recomandat consult medical rapid, iar pentru durere în piept, dificultăți de respirație, durere abdominală severă, leșin, confuzie sau sânge în urină/scaun/vărsături, mergi la urgență."
        : en
          ? "What you describe may include warning signs. Prompt medical consultation is recommended. If the pain is severe, there is deformity, numbness, breathing difficulties, or you cannot use the area, go to the emergency room."
          : "Ce descrii poate include semne de alarmă. Este recomandat consult medical rapid, iar dacă durerea este severă, există deformare, amorțeală, dificultăți de respirație sau nu poți folosi zona, mergi la urgență."
      : input.tissue === "organ"
        ? en
          ? "I can provide educational guidance, without diagnosis. Organ-related symptoms need clarification about location, intensity, onset, and associated signs."
          : "Pot să te orientez educațional, fără diagnostic. Simptomele legate de organe au nevoie de clarificări despre localizare, intensitate, debut și semne asociate."
        : en
          ? "I can provide educational guidance, without diagnosis. Pain after exertion, a fall, or impact can have different causes — from contusion/overuse to sprain, dislocation, or fracture — depending on context."
          : "Pot să te orientez educațional, fără diagnostic. Durerea după efort, căzătură sau lovitură poate avea cauze diferite, de la contuzie/suprasolicitare până la entorsă, luxație sau fractură, în funcție de context.";

  return formatSixSectionAnswer({
    summary: [route.conflictNote, urgentIntro].filter(Boolean).join(" "),
    causes: [
      route.entities.bodyRegionLabel
        ? en ? `Indicated area: ${route.entities.bodyRegionLabel}.` : `Zona indicată: ${route.entities.bodyRegionLabel}.`
        : en ? "The indicated area is not yet clear." : "Zona indicată nu este clară încă.",
      route.entities.symptoms.length
        ? en ? `Detected symptoms: ${route.entities.symptoms.join(", ")}.` : `Simptome detectate: ${route.entities.symptoms.join(", ")}.`
        : en ? "Detected symptoms: non-specific pain/discomfort." : "Simptome detectate: durere/disconfort nespecific.",
      route.entities.contexts.length
        ? en ? `Detected context: ${route.entities.contexts.join(", ")}.` : `Context detectat: ${route.entities.contexts.join(", ")}.`
        : en ? "Detected context: unclear." : "Context detectat: neclar.",
    ],
    aggravators: redFlags.length
      ? redFlags
      : [en
          ? "Severe pain, worsening symptoms, or inability to use the area may indicate increased risk."
          : "Durerea severă, agravarea simptomelor sau imposibilitatea folosirii zonei pot indica risc crescut."],
    safeActions: questions.map((question) => en ? `Clarification: ${question}` : `Clarificare: ${question}`),
    consult: redFlags.length
      ? redFlags
      : [en
          ? "Consult a doctor if the pain is severe, persists, worsens, or appears after trauma."
          : "Consultă un medic dacă durerea este severă, persistă, se agravează sau apare după traumatism."],
  }, lang);
}

function buildDbAnswer(
  input: z.infer<typeof InputSchema>,
  context: KnowledgeEntry[],
  isFirstMessage: boolean,
  route: AiRoute,
  symptomState: SymptomState,
  contextSwitch: ContextSwitchAction,
) {
  void isFirstMessage;
  const lang = input.lang ?? "ro";

  if (route.category === "out_of_scope") {
    return getCriticalGuardrailFallback(context, "medical_scope_only", lang) ?? buildOutOfScopeAnswer(lang);
  }
  if (
    hasAny(input.question, [
      "diagnostic sigur",
      "diagnostic cert",
      "pune diagnostic",
      "diagnosticheaza",
      "diagnostichează",
      "give me a diagnosis",
      "diagnose me",
      "final diagnosis",
      "definitive diagnosis",
    ])
  ) {
    const diagnosisFallback = getCriticalGuardrailFallback(context, "no_real_diagnosis", lang);
    if (diagnosisFallback) return diagnosisFallback;
  }
  if (route.category === "app_specific") return buildAppSpecificAnswer(context, lang);
  if (isStructureClarificationReply(route, symptomState))
    return buildStructureClarificationAnswer(input, lang);
  if (
    contextSwitch.selected_context_fit === "different_body_region_detected" ||
    contextSwitch.selected_context_fit === "likely_muscular_but_bone_selected" ||
    contextSwitch.selected_context_fit === "likely_bone_joint_but_muscle_selected" ||
    (contextSwitch.selected_context_fit === "red_flag_priority" &&
      contextSwitch.should_switch_context)
  ) {
    return buildContextSwitchAnswer(input, contextSwitch, lang);
  }
  if (route.category === "unclear_message") return buildUnclearAnswer(input, symptomState, lang);

  const vagueQuestion = isVaguePainQuestion(input.question);
  const shortSymptomFollowUp = isShortSymptomFollowUp(input.question, symptomState);
  const contextualReply = isContextualReply(input.question, symptomState);
  const deterministicPainStep =
    symptomState.pain_present &&
    symptomState.next_step !== "recommend" &&
    route.category !== "selection_specific";
  const alreadyRecommended = symptomState.next_step === "recommend";
  if (!alreadyRecommended && (vagueQuestion || shortSymptomFollowUp || contextualReply || deterministicPainStep)) {
    return buildClarifyingAnswer(input, symptomState, lang);
  }

  if (route.mode === "GENERAL_MEDICAL_MODE") {
    return buildGeneralMedicalFallback(input, route, context, lang);
  }

  if (context.length === 0) {
    return formatSixSectionAnswer({
      summary: lang === "en"
        ? `I haven't found enough information in the Santix database yet for ${input.structureName}.`
        : `Nu am găsit încă informații suficiente în baza Santix pentru ${input.structureName}.`,
      causes: [lang === "en"
        ? "I don't have enough information in the Santix database to answer this question with certainty."
        : "Nu am suficiente informații în baza de date Santix pentru a răspunde sigur la această întrebare."],
      aggravators: [lang === "en"
        ? "I cannot evaluate aggravating factors without relevant Santix context."
        : "Nu pot evalua factorii agravanți fără context Santix relevant."],
      safeActions: [lang === "en"
        ? "Rephrase the question or select a structure for which medical data exists in the Santix database."
        : "Reformulează întrebarea sau selectează o structură pentru care există date medicale în baza Santix."],
      consult: [lang === "en"
        ? "Consult a doctor if symptoms are severe, persistent, worsening, or warning signs appear."
        : "Consultă un medic dacă simptomele sunt severe, persistente, se agravează sau apar semnale de alarmă."],
    }, lang);
  }

  const anatomyQuestion = hasAny(input.question, [
    "ce este",
    "ce rol",
    "rol are",
    "functie",
    "functia",
    "la ce foloseste",
  ]);
  if (route.category === "selection_specific" && anatomyQuestion) {
    return buildSelectionSpecificAnswer(input, context, lang);
  }

  return buildFollowUpAnswer(input, context, lang);
}

function formatContextForPrompt(context: KnowledgeEntry[]) {
  return context
    .map((entry, index) => {
      return [
        `[${index + 1}] ${entry.title_ro}`,
        `Țesut sursă: ${entry.tissue ?? "necunoscut"}`,
        `Structură/Regiune sursă: ${entry.structure_slug ?? entry.model_selection_id ?? entry.body_region ?? "general"}`,
        `Categorie: ${entry.category}`,
        `Conținut: ${entry.content_ro}`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatSixSectionAnswer(sections: {
  summary: string;
  causes?: string[];
  aggravators?: string[];
  safeActions?: string[];
  consult?: string[];
}, lang: "ro" | "en" = "ro") {
  const en = lang === "en";
  return [
    en ? "1. Brief summary" : "1. Rezumat scurt",
    sections.summary,
    "",
    en ? "2. Possible causes based on Santix data" : "2. Posibile cauze pe baza datelor Santix",
    ...(sections.causes?.length
      ? sections.causes.map((item, index) => `${index + 1}. ${item}`)
      : [en
          ? "1. I don't have enough information in the Santix database to indicate a certain cause."
          : "1. Nu am suficiente informații în baza de date Santix pentru a indica o cauză sigură."]),
    "",
    en ? "3. What could aggravate the problem" : "3. Ce ar putea agrava problema",
    ...(sections.aggravators?.length
      ? sections.aggravators.map((item, index) => `${index + 1}. ${item}`)
      : [en
          ? "1. Straining the painful area, movements that increase pain, or ignoring persistent symptoms."
          : "1. Solicitarea zonei dureroase, mișcările care cresc durerea sau ignorarea simptomelor persistente."]),
    "",
    en ? "4. What the user can generally and safely do" : "4. Ce poate face utilizatorul în mod general și sigur",
    ...(sections.safeActions?.length
      ? sections.safeActions.map((item, index) => `${index + 1}. ${item}`)
      : [en ? "1. Reduce strain on the area and monitor symptom progression." : "1. Redu solicitarea zonei și urmărește evoluția simptomelor."]),
    "",
    en ? "5. When to consult a doctor" : "5. Când ar trebui să consulte un medic",
    ...(sections.consult?.length
      ? sections.consult.map((item, index) => `${index + 1}. ${item}`)
      : [en
          ? "1. Consult a doctor if the pain is severe, persists, worsens, or warning signs appear."
          : "1. Consultă un medic dacă durerea este severă, persistă, se agravează sau apar semnale de alarmă."]),
    "",
    en ? "6. Informational limit" : "6. Limită informativă",
    en
      ? "Informational response based exclusively on Santix data. Does not replace medical consultation."
      : "Răspuns informativ bazat exclusiv pe datele Santix. Nu înlocuiește consultul medical.",
  ].join("\n");
}

function applyContextSwitchToSymptomState(state: SymptomState, contextSwitch: ContextSwitchAction) {
  state.should_switch_context = contextSwitch.should_switch_context;
  state.target_layer = contextSwitch.target_layer;
  state.target_structure_slug = contextSwitch.target_structure_slug;
  state.target_body_region = contextSwitch.target_body_region;
  state.confidence = contextSwitch.confidence;
  state.switch_locked_until_clarification = contextSwitch.switch_locked_until_clarification;
}

function buildStructuredResponse(
  answer: string,
  route: AiRoute,
  symptomState: SymptomState,
  contextSwitch: ContextSwitchAction,
  context: KnowledgeEntry[],
): SantixStructuredAiOutput {
  return buildStructuredAiOutput({
    reply: answer,
    intent: symptomState.last_question_intent ?? route.reason,
    classification: route.category,
    red_flags_detected: symptomState.red_flags_detected,
    next_question_intent: symptomState.next_step === "recommend" ? null : symptomState.next_step,
    should_switch_context: contextSwitch.should_switch_context,
    target_layer: contextSwitch.target_layer,
    target_structure_slug: contextSwitch.target_structure_slug,
    confidence: contextSwitch.confidence,
    needs_medical_attention:
      symptomState.red_flags_detected ||
      symptomState.next_step === "urgent" ||
      symptomState.severity === "severe" ||
      symptomState.movement_ok === "no",
    used_context: context.slice(0, 8).map((entry) => entry.id),
  });
}

function buildOllamaPrompt(
  input: z.infer<typeof InputSchema>,
  context: KnowledgeEntry[],
  previousMessages: ConversationMessage[],
  route: AiRoute,
  symptomState: SymptomState,
) {
  void route;

  const en = input.lang === "en";

  const tissueLabel = en
    ? input.tissue === "os"
      ? "bone"
      : input.tissue === "muschi"
        ? "muscle"
        : input.tissue === "organ"
          ? "internal organ"
          : "tendon"
    : input.tissue === "os"
      ? "oase"
      : input.tissue === "muschi"
        ? "mușchi"
        : input.tissue === "organ"
          ? "organ intern"
          : "tendon";

  const history = previousMessages
    .slice(-8)
    .map(
      (message) =>
        `${message.role === "user" ? (en ? "User" : "Utilizator") : "Santix"}: ${message.role === "user" ? normalizeColloquialAddressing(message.content_ro) : message.content_ro}`,
    )
    .join("\n");

  if (en) {
    return [
      "You are Santix AI, an educational medical assistant integrated in a 3D anatomy application with bones, muscles and internal organs.",
      "",
      "The user has already selected an anatomical structure from the 3D model.",
      "",
      "SELECTED STRUCTURE:",
      input.structureName,
      "",
      "SELECTED CATEGORY:",
      tissueLabel,
      "",
      "SANTIX DATABASE CONTEXT:",
      context.length
        ? formatContextForPrompt(context)
        : "No relevant Santix context was retrieved for this question.",
      "",
      "CONVERSATION HISTORY:",
      history || "No previous history.",
      "",
      "SYMPTOM_STATE:",
      JSON.stringify(symptomState),
      "",
      "STRICT RULES:",
      "1. Always assume the anatomical area is already selected.",
      "2. Never ask the user to specify which bone, muscle, organ or area they selected.",
      "3. Do not say 'specify the bone', 'choose the area' or 'select the structure'.",
      "4. If the user's message is vague (e.g. 'it hurts'), ask about symptoms, left/right side, intensity and onset. For organs ask about fever, nausea/vomiting, breathing difficulties, chest pain and blood in urine/stool; do not ask about muscle tension or range of motion.",
      "5. Respond only about the selected area.",
      "6. Respond only based on the Santix database context provided.",
      "7. Do not invent diagnoses or treatments.",
      "8. Do not give a final diagnosis.",
      "9. Do not recommend medications or doses.",
      "10. Recommend medical consultation when warning signs appear.",
      "11. Respond in clear, natural English.",
      "12. Do not use Markdown.",
      "13. Do not use symbols such as **, ###, or dash-bullet lists.",
      "14. Use short, clear sentences.",
      "15. If you don't have enough information in the database, state clearly that the Santix database does not contain enough information for a reliable answer.",
      "16. For pain, symptoms or injuries, ask at most 1-2 clarifying questions per message.",
      "17. Do not turn the conversation into a medical form. Continue gradually, like a natural dialogue.",
      "18. If warning signs are present, the recommendation to seek urgent medical care takes priority over clarifying questions.",
      "19. Use the history and SYMPTOM_STATE. If the user has already answered a question, do not repeat it.",
      "20. If the user replies briefly, interpret the answer in the context of the last Santix question.",
      "",
      "BEHAVIOUR FOR VAGUE MESSAGES:",
      "If the user writes 'it hurts', 'I have pain', 'pain', 'what could it be' or a very short message:",
      "",
      "Do not repeat the name of the selected area.",
      "Do not say 'You have selected the area'.",
      "Do not ask the user to specify the area.",
      "Do not ask 'where does it hurt?'. The general area is already selected in the interface.",
      "Do not offer a diagnosis.",
      "Do not list causes yet.",
      "Respond only with short, natural questions in clear English.",
      "",
      "Required format for a vague message:",
      "I'm sorry to hear you're in pain. Did it come on after an impact or fall, or after physical exertion? And can you move the area normally?",
      "",
      "If the pain is severe, the area is deformed, you cannot move it, or the pain appeared after an accident, advise the user to see a doctor urgently.",
      "",
      "Choosing questions:",
      "If the user mentions an accident, impact or fall, ask about severity and warning signs.",
      "If the user mentions pain on movement, ask which movement makes it worse.",
      "If the user provides no context, ask when it started and how severe it is.",
      "",
      "IMPORTANT: You must respond ONLY in English, regardless of the language of the database context or the user's message.",
      "",
      "USER'S QUESTION:",
      input.question,
    ].join("\n");
  }

  return [
    "Ești Santix AI, un asistent medical educațional integrat într-o aplicație 3D cu oase, mușchi și organe interne.",
    "",
    "Utilizatorul a selectat deja o structură anatomică din modelul 3D.",
    "",
    "ZONA SELECTATĂ:",
    input.structureName,
    "",
    "CATEGORIE SELECTATĂ:",
    tissueLabel,
    "",
    "CONTEXT DIN BAZA DE DATE SANTIX:",
    context.length
      ? formatContextForPrompt(context)
      : "Nu există context Santix relevant recuperat pentru această întrebare.",
    "",
    "ISTORIC RELEVANT:",
    history || "Nu există istoric anterior.",
    "",
    "SYMPTOM_STATE:",
    JSON.stringify(symptomState),
    "",
    "REGULI STRICTE:",
    "1. Consideră întotdeauna că zona anatomică este deja selectată.",
    "2. Nu cere utilizatorului să specifice ce os, mușchi, organ sau zonă a selectat.",
    '3. Nu spune "specifică osul", "alege zona" sau "selectează structura".',
    '4. Dacă mesajul utilizatorului este vag, de exemplu "mă doare", întreabă despre simptome, localizare pe partea stângă/dreaptă, intensitate și debut. Pentru organe întreabă despre febră, greață/vărsături, dificultăți de respirație, durere în piept și sânge în urină/scaun; nu întreba despre încordare musculară sau mișcarea zonei.',
    "5. Răspunde doar despre zona selectată.",
    "6. Răspunde doar pe baza contextului din baza de date Santix.",
    "7. Nu inventa diagnostice sau tratamente.",
    "8. Nu pune diagnostic final.",
    "9. Nu recomanda medicamente sau doze.",
    "10. Recomandă consult medical când apar semnale de alarmă.",
    "11. Răspunde în română corectă, naturală și cu diacritice.",
    "12. Nu folosi Markdown.",
    "13. Nu folosi simboluri precum **, ### sau liste cu liniuță.",
    "14. Folosește propoziții scurte și clare.",
    "15. Dacă nu ai suficiente informații în baza de date, spune clar că baza Santix nu conține suficiente informații pentru un răspuns sigur.",
    "16. Pentru durere, simptome sau accidentări, pune maximum 1-2 întrebări de clarificare într-un mesaj.",
    "17. Nu transforma conversația într-un formular medical. Continuă gradual, ca într-un dialog.",
    "18. Dacă există semnale de alarmă, recomandarea de consult medical rapid sau urgență are prioritate peste întrebările de clarificare.",
    "19. Folosește istoricul și SYMPTOM_STATE. Dacă utilizatorul a răspuns deja la o întrebare, nu o repeta.",
    "20. Dacă utilizatorul răspunde scurt, interpretează răspunsul în contextul ultimei întrebări Santix.",
    "",
    "COMPORTAMENT PENTRU MESAJE VAGI:",
    'Dacă utilizatorul scrie "mă doare", "am durere", "doare", "ce poate fi" sau un mesaj foarte scurt:',
    "",
    "Nu repeta numele zonei selectate.",
    'Nu spune "Ai selectat zona".',
    "Nu cere utilizatorului să specifice zona.",
    'Nu întreba "unde te doare?". Zona generală este deja selectată în interfață.',
    "Nu oferi diagnostic.",
    "Nu enumera cauze încă.",
    "Răspunde doar cu întrebări scurte, naturale, în română corectă.",
    "",
    "Format obligatoriu pentru mesaj vag:",
    "Îmi pare rău că te doare. A apărut după o lovitură/căzătură sau după efort? Și poți mișca zona normal?",
    "",
    "Dacă durerea este severă, zona este deformată, nu o poți mișca sau durerea a apărut după un accident, consultă urgent un medic.",
    "",
    "Alegerea întrebărilor:",
    "Dacă utilizatorul menționează accident, lovitură sau căzătură, întreabă despre severitate și semne de alarmă.",
    "Dacă utilizatorul menționează durere la mișcare, întreabă ce mișcare o accentuează.",
    "Dacă utilizatorul nu oferă context, întreabă când a apărut și cât de severă este.",
    "",
    "IMPORTANT: Răspunde DOAR în română, indiferent de limba în care este scrisă întrebarea utilizatorului.",
    "",
    "ÎNTREBAREA UTILIZATORULUI:",
    input.question,
  ].join("\n");
}

async function askOllama(
  input: z.infer<typeof InputSchema>,
  context: KnowledgeEntry[],
  previousMessages: ConversationMessage[],
  route: AiRoute,
  symptomState: SymptomState,
) {
  const provider = createAiProvider();
  return provider.generateText({
    messages: [
      {
        role: "system",
        content:
          input.lang === "en"
            ? "You are Santix AI, an educational medical assistant. Respond strictly based on the provided context. Do not invent information or give final diagnoses. Recommend medical consultation when necessary. For pain or injuries, ask at most 1-2 questions per message. Respond in clear, short English. Do not use Markdown or bullet lists."
            : "Ești Santix AI, un asistent medical educațional. Răspunzi strict pe baza contextului primit. Nu inventezi informații. Nu pui diagnostice finale. Recomanzi consult medical când e necesar. Pentru durere, simptome sau accidentări, pune maximum 1-2 întrebări per mesaj și continuă gradual. Răspunzi în română, clar și scurt. Nu folosi Markdown, simboluri de formatare sau liste cu liniuță.",
      },
      {
        role: "user",
        content: buildOllamaPrompt(input, context, previousMessages, route, symptomState),
      },
    ],
    temperature: 0.35,
    topP: 0.9,
    maxTokens: 420,
  });
}

export const askSelectionAi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<SelectionAiResponse> => {
    const safeQuestion = validateAiUserText(data.question, 900);
    if (safeQuestion.rejectedReason) {
      throw new Error(safeQuestion.rejectedReason);
    }

    const rawAiInput = normalizeInputForAi({ ...data, question: safeQuestion.text });
    const supabase = createUserSupabaseClient(data.accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(data.accessToken);

    if (userError || !user) {
      throw new Error("Trebuie să fii logat pentru a folosi asistentul AI.");
    }

    assertRateLimitAllowed(
      await enforceAiRateLimit(supabase, {
        userId: user.id,
        action: "selection_ai_per_minute",
        limit: 12,
        windowSeconds: 60,
      }),
    );
    assertRateLimitAllowed(
      await enforceAiRateLimit(supabase, {
        userId: user.id,
        action: "selection_ai_per_day",
        limit: 150,
        windowSeconds: 86_400,
      }),
    );

    let conversationId = data.conversationId;
    let persistedStructuredState: unknown = {};
    let structuredStateAvailable = true;
    const rawScope = inferSelectionScope(rawAiInput);
    const structureSlug = await resolveExistingStructureSlug(supabase, rawScope);
    const displayStructureName = await resolveStructureDisplayNameForAi(
      supabase,
      rawAiInput,
      rawScope,
      structureSlug,
    );
    const aiInput = { ...rawAiInput, structureName: displayStructureName };
    const route = classifyQuestion(aiInput);
    const scope = inferSelectionScope(aiInput);

    if (!conversationId) {
      const conversation = await createAiConversation({
        supabase,
        userId: user.id,
        structureSlug,
        scope,
        aiInput,
        route,
      });

      conversationId = conversation.id;
      persistedStructuredState = conversation.structuredState;
      structuredStateAvailable = conversation.structuredStateAvailable;
    } else {
      const conversationState = await loadAiConversationState(supabase, conversationId);
      persistedStructuredState = conversationState.structuredState;
      structuredStateAvailable = conversationState.structuredStateAvailable;
    }

    let selectionContext: KnowledgeEntry[] = [];
    if (
      route.category !== "out_of_scope" &&
      route.category !== "app_specific" &&
      route.category !== "unclear_message"
    ) {
      selectionContext = await getSelectionContext(supabase, aiInput, scope, structureSlug, route);
    }

    const baseContext =
      route.mode === "GENERAL_MEDICAL_MODE"
        ? await getGeneralMedicalContext(supabase, aiInput, route, selectionContext)
        : route.category === "app_specific"
          ? []
          : selectionContext;
    const guardrailContext =
      route.category !== "app_specific" && route.category !== "unclear_message"
        ? await getGuardrailContext(supabase, aiInput.lang)
        : [];
    const context = [...guardrailContext, ...baseContext];

    const { count: previousMessageCount } = await supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);

    const { data: previousMessagesData } = await supabase
      .from("ai_messages")
      .select("role, content_ro")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(8);

    const previousMessages = ((previousMessagesData ?? []) as ConversationMessage[]).reverse();
    const symptomState = mergePersistedStateIntoLegacy(
      inferSymptomState(aiInput, previousMessages),
      persistedStructuredState,
    ) as SymptomState;
    const contextSwitch = evaluateSelectedContextFit(aiInput, route, symptomState);
    applyContextSwitchToSymptomState(symptomState, contextSwitch);
    let answer = buildDbAnswer(
      aiInput,
      context,
      (previousMessageCount ?? 0) === 0,
      route,
      symptomState,
      contextSwitch,
    );
    const deterministicPainStep =
      symptomState.pain_present &&
      symptomState.next_step !== "recommend" &&
      route.category !== "selection_specific";
    const alreadyRecommended = symptomState.next_step === "recommend";
    const shouldUseDeterministicAnswer =
      route.category === "out_of_scope" ||
      route.category === "unclear_message" ||
      route.category === "app_specific" ||
      isStructureClarificationReply(route, symptomState) ||
      contextSwitch.selected_context_fit !== "correct_context" ||
      (!alreadyRecommended && deterministicPainStep) ||
      (!alreadyRecommended && isVaguePainQuestion(aiInput.question)) ||
      (!alreadyRecommended && isShortSymptomFollowUp(aiInput.question, symptomState)) ||
      (!alreadyRecommended && isContextualReply(aiInput.question, symptomState));

    const isEnContentRoute =
      aiInput.lang === "en" &&
      (route.category === "selection_specific" ||
        route.category === "medical_general" ||
        route.category === "symptom_or_injury" ||
        route.category === "red_flag_or_urgent");

    const isContextualUnclear =
      route.category === "unclear_message" &&
      Boolean(symptomState.last_question_intent);

    try {
      if (!shouldUseDeterministicAnswer || isEnContentRoute || isContextualUnclear) {
        answer = await askOllama(aiInput, context, previousMessages, route, symptomState);
      }
    } catch (error) {
      console.warn("Ollama unavailable, using deterministic Santix answer:", error);
    }

    const safeAnswer = sanitizeTextForStorage(answer, 2_400);
    const structured = buildStructuredResponse(safeAnswer, route, symptomState, contextSwitch, context);

    const { error: messageError } = await supabase.from("ai_messages").insert([
      {
        conversation_id: conversationId,
        role: "user",
        content_ro: safeQuestion.text,
        retrieved_context: [
          {
            route: route.category,
            mode: route.mode,
            entities: route.entities,
            symptom_state: symptomState,
            normalized_question: aiInput.question,
            context_switch: contextSwitch,
          },
        ],
      },
      {
        conversation_id: conversationId,
        role: "assistant",
        content_ro: safeAnswer,
        retrieved_context: {
          route: route.category,
          mode: route.mode,
          symptom_state: symptomState,
          structured_output: structured,
          context_switch: contextSwitch,
          context: context.map((entry) => ({
            id: entry.id,
            category: entry.category,
            priority: entry.priority,
            source:
              entry.structure_slug ?? entry.model_selection_id ?? entry.body_region ?? "general",
          })),
        },
      },
    ]);

    if (messageError) {
      throw new Error(messageError.message);
    }

    const activeConversationId = conversationId;
    if (!activeConversationId) {
      throw new Error("Conversația AI nu a fost inițializată corect.");
    }

    await updateAiConversationState({
      supabase,
      conversationId: activeConversationId,
      symptomState,
      structuredStateAvailable,
    });

    return {
      conversationId: activeConversationId,
      answer: safeAnswer,
      contextCount: context.length,
      structured,
      route: {
        category: route.category,
        mode: route.mode,
        selectedSubjectMentioned: route.selectedSubjectMentioned,
        selectionConflict: route.selectionConflict,
        target_structure_slug: route.targetStructureSlug,
        target_structure_type: route.targetStructureType,
        target_body_region: route.targetBodyRegion,
        should_update_3d_selection: route.shouldUpdate3dSelection,
      },
      contextSwitch,
    };
  });
