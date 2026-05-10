import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const TissueSchema = z.enum(["os", "muschi", "tendon"]);

const InputSchema = z.object({
  accessToken: z.string().min(10),
  question: z.string().min(2).max(900),
  tissue: TissueSchema,
  structureName: z.string().min(1).max(160),
  structureSlug: z.string().min(1).max(160).optional(),
  modelSelectionId: z.string().min(1).max(160).optional(),
  bodyRegion: z.string().min(1).max(160).optional(),
  conversationId: z.string().uuid().optional(),
});

type KnowledgeEntry = {
  id: string;
  tissue?: string;
  structure_slug?: string | null;
  model_selection_id?: string | null;
  body_region?: string | null;
  category: string;
  title_ro: string;
  content_ro: string;
  priority: number;
};

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

type QuestionCategory =
  | "selection_specific"
  | "medical_general"
  | "symptom_or_injury"
  | "red_flag_or_urgent"
  | "out_of_scope"
  | "app_specific";

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

export interface SelectionAiResponse {
  conversationId: string;
  answer: string;
  contextCount: number;
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
  { key: "mana", label: "mână / încheietură", terms: ["mana", "mainii", "palma", "deget", "degete", "incheietura", "pumn", "carp", "metacarp"], bodyRegions: ["mana", "mana_antebrat", "antebrat"], targetStructureSlug: "carp", targetStructureType: "os" },
  { key: "cot", label: "cot", terms: ["cot", "cotul", "olecran"], bodyRegions: ["antebrat", "brat"], targetStructureSlug: null, targetStructureType: null },
  { key: "umar", label: "umăr", terms: ["umar", "umarul", "scapula", "clavicula", "omoplat", "deltoid"], bodyRegions: ["umar_centura_scapulara", "membru_superior"], targetStructureSlug: "scapula", targetStructureType: "os" },
  { key: "brat", label: "braț", terms: ["brat", "bratul", "antebrat", "humerus", "radius", "ulna", "biceps", "triceps"], bodyRegions: ["brat", "antebrat", "membru_superior", "mana_antebrat"], targetStructureSlug: "humerus", targetStructureType: "os" },
  { key: "spate", label: "spate / coloană", terms: ["spate", "coloana", "lombar", "cervical", "toracal", "vertebr", "ceafa"], bodyRegions: ["coloana", "trunchi", "cap_gat"], targetStructureSlug: "vert-lombare", targetStructureType: "os" },
  { key: "gat", label: "gât", terms: ["gat", "ceafa", "cervical"], bodyRegions: ["gat", "cap_gat", "coloana"], targetStructureSlug: "vert-cervicale", targetStructureType: "os" },
  { key: "genunchi", label: "genunchi", terms: ["genunchi", "rotula", "patela"], bodyRegions: ["coapsa_sold_genunchi", "membru_inferior"], targetStructureSlug: "rotula", targetStructureType: "os" },
  { key: "glezna", label: "gleznă", terms: ["glezna", "glezne", "maleola"], bodyRegions: ["picior", "gamba", "membru_inferior"], targetStructureSlug: "tars", targetStructureType: "os" },
  { key: "sold", label: "șold / bazin", terms: ["sold", "bazin", "pelvis", "coxal", "inghinal"], bodyRegions: ["pelvis", "membru_inferior"], targetStructureSlug: "coxal", targetStructureType: "os" },
  { key: "picior", label: "picior / talpă", terms: ["picior", "talpa", "calcai", "degetele de la picior", "tars", "metatars", "gamba", "coapsa"], bodyRegions: ["picior", "gamba", "coapsa_sold_genunchi", "membru_inferior"], targetStructureSlug: "tars", targetStructureType: "os" },
  { key: "torace", label: "torace / piept", terms: ["torace", "piept", "coaste", "stern", "respiratie"], bodyRegions: ["torace", "trunchi"], targetStructureSlug: "coaste", targetStructureType: "os" },
  { key: "cap", label: "cap / față", terms: ["cap", "craniu", "fata", "frunte", "mandibula", "ochi"], bodyRegions: ["cap_craniu", "fata", "cap_gat"], targetStructureSlug: "frontal", targetStructureType: "os" },
];

const SYMPTOM_TERMS: Array<{ key: string; terms: string[] }> = [
  { key: "durere", terms: ["durere", "ma doare", "doare", "dureros", "jena"] },
  { key: "umflare", terms: ["umflat", "umflare", "inflamat", "edem"] },
  { key: "amorțeală", terms: ["amorteala", "amortit", "furnicaturi", "nu simt", "pierderea sensibilitatii"] },
  { key: "vânătaie", terms: ["vanataie", "vanat", "echimoza"] },
  { key: "slăbiciune", terms: ["slabiciune", "pierdere de forta", "nu am forta"] },
  { key: "rigiditate", terms: ["rigid", "intepenit", "intepeneala", "blocaj", "blocat"] },
  { key: "limitare de mișcare", terms: ["nu pot misca", "limitare", "nu pot folosi", "nu pot ridica", "nu pot calca", "nu pot sprijini"] },
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
  { key: "imposibilitate de mișcare", terms: ["nu pot misca", "nu pot folosi", "nu pot ridica", "nu pot indoi"] },
  { key: "imposibilitate de sprijin", terms: ["nu pot calca", "nu pot sprijini", "nu pot merge", "nu pot pune greutate"] },
  { key: "slăbiciune bruscă", terms: ["slabiciune brusca", "nu am forta", "pierdere de forta"] },
  { key: "dificultăți de respirație", terms: ["dificultate de respiratie", "nu pot respira", "respir greu"] },
  { key: "durere toracică", terms: ["durere toracica", "durere in piept", "ma doare pieptul"] },
  { key: "febră mare", terms: ["febra mare", "febra"] },
  { key: "control urinar/fecal afectat", terms: ["urina", "scaun", "control urinar", "control fecal", "incontinenta"] },
  { key: "traumatism puternic", terms: ["accident", "traumatism puternic", "impact puternic", "cazut de la inaltime"] },
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
  "unde se afla",
  "la ce foloseste",
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
];

function collectMatches(text: string, entries: Array<{ key: string; terms: string[] }>) {
  return entries.filter((entry) => entry.terms.some((term) => text.includes(term))).map((entry) => entry.key);
}

function extractQuestionEntities(question: string): ExtractedEntities {
  const text = normalizeText(question);
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
  const text = normalizeText([
    input.structureName,
    input.structureSlug,
    input.modelSelectionId,
    input.bodyRegion,
  ].filter(Boolean).join(" "));

  return BODY_REGION_TERMS.find((entry) => entry.terms.some((term) => text.includes(term)))?.key ?? null;
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

function classifyQuestion(input: z.infer<typeof InputSchema>): AiRoute {
  const text = normalizeText(input.question);
  const entities = extractQuestionEntities(input.question);
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
    selectionConflict && Boolean(target.targetStructureSlug && target.targetStructureType && target.targetBodyRegion);
  const selectedTerms = [
    input.structureName,
    input.structureSlug,
    input.modelSelectionId,
  ]
    .map(normalizeText)
    .filter((value) => value.length >= 3);
  const selectedSubjectMentioned = selectedTerms.some((term) => text.includes(term));
  const hasRedFlag = entities.redFlags.length > 0;
  const hasSymptomOrInjury =
    entities.symptoms.length > 0 ||
    entities.contexts.length > 0 ||
    hasAny(text, ["ma doare", "accidentare", "trauma", "lovitura", "cazut", "sport", "alerg"]);
  const isAppSpecific = APP_SPECIFIC_TERMS.some((term) => text.includes(term));
  const isMedical = MEDICAL_GENERAL_TERMS.some((term) => text.includes(term)) || hasSymptomOrInjury || !!entities.bodyRegion;
  const isOutOfScope = OUT_OF_SCOPE_TERMS.some((term) => text.includes(term)) && !isMedical && !isAppSpecific;

  if (isOutOfScope) {
    return { category: "out_of_scope", mode: null, entities, reason: "Întrebarea nu are legătură cu sănătatea sau aplicația.", selectedSubjectMentioned, selectedRegionKey, selectionConflict: false, conflictNote: null, targetStructureSlug: null, targetStructureType: null, targetBodyRegion: null, shouldUpdate3dSelection: false };
  }

  if (isAppSpecific && !isMedical) {
    return { category: "app_specific", mode: null, entities, reason: "Întrebarea cere date interne despre Santix.", selectedSubjectMentioned, selectedRegionKey, selectionConflict: false, conflictNote: null, targetStructureSlug: null, targetStructureType: null, targetBodyRegion: null, shouldUpdate3dSelection: false };
  }

  if (hasRedFlag) {
    return { category: "red_flag_or_urgent", mode: "GENERAL_MEDICAL_MODE", entities, reason: "Conține semne de alarmă.", selectedSubjectMentioned, selectedRegionKey, selectionConflict, conflictNote, ...target, shouldUpdate3dSelection };
  }

  if (hasSymptomOrInjury) {
    return { category: "symptom_or_injury", mode: "GENERAL_MEDICAL_MODE", entities, reason: "Descrie durere, simptom, efort sau traumatism.", selectedSubjectMentioned, selectedRegionKey, selectionConflict, conflictNote, ...target, shouldUpdate3dSelection };
  }

  if (SELECTION_TERMS.some((term) => text.includes(term))) {
    return { category: "selection_specific", mode: "3D_SELECTION_MODE", entities, reason: "Întrebare despre structura selectată sau anatomie.", selectedSubjectMentioned, selectedRegionKey, selectionConflict, conflictNote, ...target, shouldUpdate3dSelection };
  }

  if (isMedical) {
    return { category: "medical_general", mode: "GENERAL_MEDICAL_MODE", entities, reason: "Întrebare medicală/anatomică generală.", selectedSubjectMentioned, selectedRegionKey, selectionConflict, conflictNote, ...target, shouldUpdate3dSelection };
  }

  return { category: "selection_specific", mode: "3D_SELECTION_MODE", entities, reason: "Fallback către selecția 3D curentă.", selectedSubjectMentioned, selectedRegionKey, selectionConflict: false, conflictNote: null, targetStructureSlug: null, targetStructureType: null, targetBodyRegion: null, shouldUpdate3dSelection: false };
}

const MUSCLE_REGION_SCOPES: Array<{
  terms: string[];
  structureSlug: string;
  bodyRegion: string;
}> = [
  {
    terms: ["muschii-mainii", "mana", "hand", "palmar", "carpal", "pollicis", "lumbrical", "interossei", "thenar", "hypothenar"],
    structureSlug: "muschi-mana-antebrat",
    bodyRegion: "mana_antebrat",
  },
  {
    terms: ["muschii-antebratului", "antebrat", "forearm", "flexor-carpi", "extensor-carpi", "extensor-indicis", "extensor-digiti-minimi", "pronator", "supinator", "brachioradialis", "palmaris"],
    structureSlug: "muschi-mana-antebrat",
    bodyRegion: "mana_antebrat",
  },
  {
    terms: ["muschii-bratului", "brat", "compartment-of-arm", "biceps", "triceps", "brachialis", "anconeus"],
    structureSlug: "muschi-brat-umar",
    bodyRegion: "membru_superior",
  },
  {
    terms: ["muschii-umarului", "umar", "shoulder", "deltoid", "supraspinatus", "infraspinatus", "subscapularis"],
    structureSlug: "muschi-brat-umar",
    bodyRegion: "membru_superior",
  },
  {
    terms: ["muschii-abdomenului", "muschii-toracelui", "muschii-spatelui", "abdomen", "torace", "trunchi", "spate", "external-abdominal-oblique", "internal-abdominal-oblique", "rectus-abdominis", "intercostal", "diaphragm", "trapezius", "latissimus", "erector-spinae", "multifidus"],
    structureSlug: "muschi-trunchi",
    bodyRegion: "trunchi",
  },
  {
    terms: ["muschii-coapsei", "muschii-gambei", "muschii-soldului", "muschii-bazinului", "coapsa", "gamba", "sold", "bazin", "compartment-of-thigh", "compartment-of-leg", "iliopectineal-arch", "levator-ani", "tibialis", "gastrocnemius", "soleus", "sartorius", "vastus", "gluteus"],
    structureSlug: "muschi-membru-inferior",
    bodyRegion: "membru_inferior",
  },
  {
    terms: ["muschii-piciorului", "picior", "laba-piciorului", "foot", "plantar", "digitorum-brevis", "hallucis-brevis", "adductor-hallucis", "abductor-hallucis"],
    structureSlug: "muschi-picior",
    bodyRegion: "picior",
  },
  {
    terms: ["muschii-capului-gatului", "cap-gat", "gat", "neck", "head", "temporoparietal", "temporoparietalis", "temporalis", "bucinator", "buccinator", "corrugator", "depressor", "levator-anguli", "levator-labii", "levator-nasolabialis", "masseter", "orbicularis", "pterygoid", "sternocleidomastoid", "scalenus", "superior-oblique", "inferior-oblique", "superior-rectus", "inferior-rectus", "lateral-rectus", "medial-rectus", "orbicularis-oculi", "pharyngeal-constrictor", "common-tendinous-ring", "inferior-tarsus"],
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
    terms: ["craniu", "frontal", "parietal", "temporal", "occipital", "sphenoid", "ethmoid", "clinoid", "sella", "petrous", "foramen-magnum", "cranial-fossa"],
    bodyRegion: "cap_craniu",
  },
  {
    terms: ["fata", "maxilla", "mandible", "zygomatic", "nasal", "lacrimal", "palatine", "vomer", "concha", "orbital", "alveolar", "infraorbital", "mental-foramen", "arytenoid", "laryngeal"],
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
    terms: ["centura-scapulara", "clavicle", "scapula", "acromion", "acromial", "coracoid", "glenoid"],
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
    terms: ["bazin", "muschii-bazinului", "hip-bone", "ilium", "ischium", "pubis", "acetabulum", "acetabular", "obturator", "iliac", "ischial", "pubic", "sacral", "gluteal-line", "iliopectineal-arch", "levator-ani"],
    structureSlug: "coxal",
    modelSelectionId: "coxal",
    bodyRegion: "pelvis",
  },
  {
    terms: ["coapsa", "femur", "femoral", "patella", "patellar", "trochanter", "linea-aspera", "intercondylar-area"],
    bodyRegion: "coapsa_sold_genunchi",
  },
  {
    terms: ["gamba", "tibia", "tibial", "fibula", "fibular", "malleolus"],
    bodyRegion: "gamba",
  },
  {
    terms: ["schelet-picior", "tarsal", "metatarsal", "phalanx-of-foot", "calcaneus", "talus", "cuboid", "cuneiform", "navicular"],
    bodyRegion: "picior",
  },
];

function inferSelectionScope(input: z.infer<typeof InputSchema>): SelectionScope {
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
          modelSelectionId: matchedScope.modelSelectionId ?? matchedScope.structureSlug ?? explicitModelSelectionId ?? null,
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
  const candidates = [
    scope.structureSlug,
    scope.modelSelectionId,
  ].filter((value): value is string => Boolean(value));

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
    .select("id, slug, name_ro, description_ro, function_ro")
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
      title_ro: `Context anatomic: ${data.name_ro}`,
      content_ro: [data.description_ro, data.function_ro ? `Funcție principală: ${data.function_ro}` : ""]
        .filter(Boolean)
        .join(" "),
      priority: 5,
    },
  ];
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
  const searchable = normalizeText([
    entry.title_ro,
    entry.content_ro,
    entry.body_region,
    entry.structure_slug,
    entry.model_selection_id,
    entry.category,
  ].filter(Boolean).join(" "));
  let score = entry.priority ?? 1;

  if (route.entities.bodyRegion && entry.body_region === route.entities.bodyRegion) score += 8;
  if (route.category === "red_flag_or_urgent" && ["semne_alarma", "triage_rule", "triaj"].includes(entry.category)) score += 10;
  if (route.category === "symptom_or_injury" && ["simptome", "cauze_posibile", "intrebari_clarificare", "recomandari"].includes(entry.category)) score += 5;

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

function makeVirtualContext(source: string, category: string, title: string, content: string, priority = 4): KnowledgeEntry {
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
  route: AiRoute,
  selectionContext: KnowledgeEntry[],
): Promise<KnowledgeEntry[]> {
  const aiKnowledgeRows = await safeSelect<KnowledgeEntry>(
    supabase
      .from("ai_knowledge_entries")
      .select("id, tissue, structure_slug, model_selection_id, body_region, category, title_ro, content_ro, priority")
      .eq("active", true)
      .order("priority", { ascending: false })
      .limit(120),
  );

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
    medical_name?: string | null;
    tissue?: string | null;
    default_level?: string | null;
    description_ro?: string | null;
    educational_note_ro?: string | null;
  }>(
    supabase
      .from("conditions")
      .select("id, slug, name_ro, medical_name, tissue, default_level, description_ro, educational_note_ro")
      .limit(80),
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
    safeSelect<Record<string, unknown>>(supabase.from("pain_classifications").select("*").limit(60)),
    safeSelect<Record<string, unknown>>(supabase.from("muscles").select("*").limit(80)),
  ]);

  const optionalContext = optionalTables.flatMap((rows, tableIndex) => {
    const tableNames = ["body_regions", "movement_patterns", "pain_classifications", "muscles"];
    return rows.map((row, index) => {
      const values = Object.entries(row)
        .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
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
      ].filter(Boolean).join(" "),
      row.red_flag ? 8 : 5,
    ),
  );

  const conditionContext = conditionRows.map((row) =>
    makeVirtualContext(
      "conditions",
      "cauze_posibile",
      `Afecțiune posibilă: ${row.name_ro}`,
      [
        row.medical_name ? `Denumire medicală: ${row.medical_name}.` : "",
        row.default_level ? `Nivel implicit: ${row.default_level}.` : "",
        row.description_ro,
        row.educational_note_ro,
      ].filter(Boolean).join(" "),
      row.default_level === "consultare_doctor" ? 7 : 5,
    ),
  );

  const triageQuestionContext = triageQuestionRows.map((row) =>
    makeVirtualContext("triage_questions", "intrebari_clarificare", `Întrebare de triaj: ${row.slug}`, row.question_ro, 5),
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
    ...aiKnowledgeRows,
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

async function getGuardrailContext(supabase: ReturnType<typeof createUserSupabaseClient>): Promise<KnowledgeEntry[]> {
  const rows = await safeSelect<{ id: string; name: string; instruction_ro: string }>(
    supabase
      .from("ai_guardrails")
      .select("id, name, instruction_ro")
      .eq("active", true)
      .limit(20),
  );

  return rows.map((row) =>
    makeVirtualContext("ai_guardrails", "guardrail", `Regulă Santix: ${row.name}`, row.instruction_ro, 10),
  );
}

function isVaguePainQuestion(question: string) {
  const normalized = normalizeForScope(question).replace(/[?.!,;:]/g, "").trim();
  return ["ma doare", "am durere", "doare", "ce poate fi", "ma dor"].includes(normalized) || normalized.split(/\s+/).length <= 3;
}

function buildClarifyingAnswer(input: z.infer<typeof InputSchema>) {
  const region = (input.bodyRegion ?? "zona").toLowerCase();
  const sideQuestion =
    region !== "zona"
      ? `Durerea este la ${region} stâng sau la ${region} drept?`
      : "Durerea este pe partea stângă sau pe partea dreaptă?";
  const structureKey = normalizeForScope(`${input.structureName} ${input.structureSlug ?? ""} ${input.modelSelectionId ?? ""}`);
  const subzoneQuestion = structureKey.includes("humerus")
    ? "Durerea este mai aproape de umăr, la mijlocul brațului sau mai aproape de cot?"
    : "Durerea este mai aproape de articulația de sus, la mijloc sau mai aproape de articulația de jos?";
  const movementQuestion = region.includes("brat")
    ? "Se accentuează când ridici sau miști brațul?"
    : "Se accentuează când miști zona?";
  const urgentRegion = region.includes("brat") ? "brațul pare deformat, nu îl poți mișca" : "zona este deformată, nu o poți mișca";

  return [
    "Îmi pare rău că te doare. Ca să înțeleg mai bine, spune-mi te rog:",
    "",
    `1. ${sideQuestion}`,
    `2. ${subzoneQuestion}`,
    "3. A apărut după o lovitură, căzătură sau efort?",
    `4. ${movementQuestion}`,
    "5. Ai umflătură, vânătaie, amorțeală sau slăbiciune?",
    "",
    `Dacă durerea este severă, ${urgentRegion} sau durerea a apărut după un accident, consultă urgent un medic.`,
  ].join("\n");
}

function buildFollowUpAnswer(input: z.infer<typeof InputSchema>, context: KnowledgeEntry[]) {
  const causes = splitSentences(findContext(context, "cauze_posibile")).slice(0, 4);
  const symptoms = splitSentences(findContext(context, "simptome")).slice(0, 4);
  const recommendations = splitSentences(findContext(context, "recomandari")).slice(0, 4);
  const redFlags = splitSentences(findContext(context, "semne_alarma")).slice(0, 4);

  const severe = hasAny(input.question, [
    "sever",
    "insuportabil",
    "nu pot",
    "nu pot misca",
    "nu pot folosi",
    "deform",
    "amorteala",
    "slabiciune",
    "pocnet",
    "cazut",
    "lovitura",
    "sange",
  ]);

  return formatSixSectionAnswer({
    summary: severe
      ? `Pentru ${input.structureName}, descrierea include semne care pot necesita evaluare medicală, mai ales dacă au apărut după traumatism sau nu poți folosi zona.`
      : `Pentru ${input.structureName}, pot orienta educațional răspunsul pe baza datelor Santix, fără diagnostic final.`,
    causes,
    aggravators: symptoms.length
      ? symptoms
      : ["Intensitatea crescută, umflarea, vânătaia, limitarea funcțională sau agravarea în timp pot indica o problemă mai importantă."],
    safeActions: recommendations.length
      ? recommendations
      : ["Evită solicitarea zonei dureroase și urmărește evoluția simptomelor."],
    consult: redFlags.length
      ? redFlags
      : ["Consultă un medic pentru durere severă, deformare, amorțeală, slăbiciune sau imposibilitate de folosire."],
  });
}

function buildSelectionSpecificAnswer(input: z.infer<typeof InputSchema>, context: KnowledgeEntry[]) {
  const anatomy = splitSentences(findContext(context, "anatomie")).slice(0, 3);
  const recommendations = splitSentences(findContext(context, "recomandari")).slice(0, 2);
  const symptoms = splitSentences(findContext(context, "simptome")).slice(0, 2);

  return formatSixSectionAnswer({
    summary: `${input.structureName} este subiectul selecției curente.`,
    causes: anatomy.length
      ? anatomy
      : [`Este o structură de tip ${input.tissue}, încadrată în modelul Santix pentru regiunea selectată.`],
    aggravators: symptoms.length
      ? symptoms
      : ["Datele Santix nu indică factori agravanți specifici pentru această structură."],
    safeActions: recommendations.length
      ? recommendations
      : ["Folosește informația ca orientare educațională și evită suprasolicitarea zonei dacă apare durere."],
    consult: ["Consultă un medic dacă durerea este severă, persistă, se agravează sau apar semnale de alarmă."],
  });
}

function buildOutOfScopeAnswer() {
  return "Pot ajuta doar cu întrebări legate de sănătate, corp, durere, recuperare, anatomie sau funcțiile Santix din acest domeniu. Reformulează te rog întrebarea în zona medicală/educațională.";
}

function buildAppSpecificAnswer(context: KnowledgeEntry[]) {
  if (context.length === 0) {
    return "Nu am informații suficiente în baza Santix despre acest aspect al aplicației. Nu vreau să inventez servicii, prețuri, abonamente sau funcții care nu sunt documentate.";
  }

  return [
    "Pot răspunde doar pe baza informațiilor Santix disponibile:",
    "",
    ...context.slice(0, 4).map((entry, index) => `${index + 1}. ${entry.content_ro}`),
  ].join("\n");
}

function buildGeneralMedicalFallback(input: z.infer<typeof InputSchema>, route: AiRoute, context: KnowledgeEntry[]) {
  const redFlags = unique([
    ...route.entities.redFlags,
    ...splitSentences(findContext(context, "semne_alarma"), [
      "deformare vizibilă",
      "durere severă",
      "amorțeală sau slăbiciune",
      "imposibilitatea de a mișca sau sprijini zona",
    ]),
  ]).slice(0, 5);
  const questions = unique([
    ...splitSentences(findContext(context, "intrebari_clarificare")),
    route.entities.bodyRegionLabel ? `Unde exact simți problema în zona ${route.entities.bodyRegionLabel}?` : "Unde exact simți problema?",
    "A apărut după căzătură, lovitură, sport sau efort repetitiv?",
    "Poți folosi zona normal sau mișcarea/sprijinul este limitat?",
  ]).slice(0, 3);

  const urgentIntro =
    route.category === "red_flag_or_urgent"
      ? "Ce descrii poate include semne de alarmă. Este recomandat consult medical rapid, iar dacă durerea este severă, există deformare, amorțeală, dificultăți de respirație sau nu poți folosi zona, mergi la urgență."
      : "Pot să te orientez educațional, fără diagnostic. Durerea după efort, căzătură sau lovitură poate avea cauze diferite, de la contuzie/suprasolicitare până la entorsă, luxație sau fractură, în funcție de context.";

  return formatSixSectionAnswer({
    summary: [route.conflictNote, urgentIntro].filter(Boolean).join(" "),
    causes: [
      route.entities.bodyRegionLabel ? `Zona indicată: ${route.entities.bodyRegionLabel}.` : "Zona indicată nu este clară încă.",
      route.entities.symptoms.length
        ? `Simptome detectate: ${route.entities.symptoms.join(", ")}.`
        : "Simptome detectate: durere/disconfort nespecific.",
      route.entities.contexts.length ? `Context detectat: ${route.entities.contexts.join(", ")}.` : "Context detectat: neclar.",
    ],
    aggravators: redFlags.length
      ? redFlags
      : ["Durerea severă, agravarea simptomelor sau imposibilitatea folosirii zonei pot indica risc crescut."],
    safeActions: questions.map((question) => `Clarificare: ${question}`),
    consult: redFlags.length
      ? redFlags
      : ["Consultă un medic dacă durerea este severă, persistă, se agravează sau apare după traumatism."],
  });
}

function buildDbAnswer(input: z.infer<typeof InputSchema>, context: KnowledgeEntry[], isFirstMessage: boolean, route: AiRoute) {
  void isFirstMessage;

  if (route.category === "out_of_scope") return buildOutOfScopeAnswer();
  if (route.category === "app_specific") return buildAppSpecificAnswer(context);

  const vagueQuestion = isVaguePainQuestion(input.question);
  if (route.category !== "red_flag_or_urgent" && vagueQuestion) {
    return buildClarifyingAnswer(input);
  }

  if (route.mode === "GENERAL_MEDICAL_MODE") {
    return buildGeneralMedicalFallback(input, route, context);
  }

  if (context.length === 0) {
    return formatSixSectionAnswer({
      summary: `Nu am găsit încă informații suficiente în baza Santix pentru ${input.structureName}.`,
      causes: ["Nu am suficiente informații în baza de date Santix pentru a răspunde sigur la această întrebare."],
      aggravators: ["Nu pot evalua factorii agravanți fără context Santix relevant."],
      safeActions: ["Reformulează întrebarea sau selectează o structură pentru care există date medicale în baza Santix."],
      consult: ["Consultă un medic dacă simptomele sunt severe, persistente, se agravează sau apar semnale de alarmă."],
    });
  }

  const anatomyQuestion = hasAny(input.question, ["ce este", "ce rol", "rol are", "functie", "functia", "la ce foloseste"]);
  if (route.category === "selection_specific" && anatomyQuestion) {
    return buildSelectionSpecificAnswer(input, context);
  }

  return buildFollowUpAnswer(input, context);
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
}) {
  return [
    "1. Rezumat scurt",
    sections.summary,
    "",
    "2. Posibile cauze pe baza datelor Santix",
    ...(sections.causes?.length ? sections.causes.map((item, index) => `${index + 1}. ${item}`) : ["1. Nu am suficiente informații în baza de date Santix pentru a indica o cauză sigură."]),
    "",
    "3. Ce ar putea agrava problema",
    ...(sections.aggravators?.length ? sections.aggravators.map((item, index) => `${index + 1}. ${item}`) : ["1. Solicitarea zonei dureroase, mișcările care cresc durerea sau ignorarea simptomelor persistente."]),
    "",
    "4. Ce poate face utilizatorul în mod general și sigur",
    ...(sections.safeActions?.length ? sections.safeActions.map((item, index) => `${index + 1}. ${item}`) : ["1. Redu solicitarea zonei și urmărește evoluția simptomelor."]),
    "",
    "5. Când ar trebui să consulte un medic",
    ...(sections.consult?.length ? sections.consult.map((item, index) => `${index + 1}. ${item}`) : ["1. Consultă un medic dacă durerea este severă, persistă, se agravează sau apar semnale de alarmă."]),
    "",
    "6. Limită informativă",
    "Răspuns informativ bazat exclusiv pe datele Santix. Nu înlocuiește consultul medical.",
  ].join("\n");
}

function buildOllamaPrompt(
  input: z.infer<typeof InputSchema>,
  context: KnowledgeEntry[],
  previousMessages: ConversationMessage[],
  route: AiRoute,
) {
  void previousMessages;
  void route;

  const tipStructura = input.tissue === "os" ? "oase" : input.tissue === "muschi" ? "mușchi" : "tendon";

  return [
    "Ești Santix AI, un asistent medical educațional integrat într-o aplicație 3D cu schelet de oase și mușchi.",
    "",
    "Utilizatorul a selectat deja o structură anatomică din modelul 3D.",
    "",
    "ZONA SELECTATĂ:",
    input.structureName,
    "",
    "CATEGORIE SELECTATĂ:",
    tipStructura,
    "",
    "CONTEXT DIN BAZA DE DATE SANTIX:",
    context.length ? formatContextForPrompt(context) : "Nu există context Santix relevant recuperat pentru această întrebare.",
    "",
    "REGULI STRICTE:",
    "1. Consideră întotdeauna că zona anatomică este deja selectată.",
    "2. Nu cere utilizatorului să specifice ce os, mușchi sau zonă a selectat.",
    "3. Nu spune „specifică osul”, „alege zona” sau „selectează structura”.",
    "4. Dacă mesajul utilizatorului este vag, de exemplu „mă doare”, întreabă despre simptome, localizare pe partea stângă/dreaptă, intensitate, debut, traumă și limitarea mișcării.",
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
    "",
    "COMPORTAMENT PENTRU MESAJE VAGI:",
    "Dacă utilizatorul scrie „mă doare”, „am durere”, „doare”, „ce poate fi” sau un mesaj foarte scurt:",
    "",
    "Nu repeta numele zonei selectate.",
    "Nu spune „Ai selectat zona”.",
    "Nu cere utilizatorului să specifice zona.",
    "Nu întreba „unde te doare?”. Zona generală este deja selectată în interfață.",
    "Nu oferi diagnostic.",
    "Nu enumera cauze încă.",
    "Răspunde doar cu întrebări scurte, naturale, în română corectă.",
    "",
    "Format obligatoriu pentru mesaj vag:",
    "Îmi pare rău că te doare. Ca să înțeleg mai bine, spune-mi te rog:",
    "",
    "1. Întreabă dacă durerea este pe partea stângă sau dreaptă.",
    "2. Întreabă dacă durerea este mai aproape de articulația de sus, la mijloc sau mai aproape de articulația de jos.",
    "3. Întreabă dacă a apărut după o lovitură, căzătură sau efort.",
    "4. Întreabă dacă se accentuează la mișcare.",
    "5. Ai umflătură, vânătaie, amorțeală sau slăbiciune?",
    "",
    "Dacă durerea este severă, zona este deformată, nu o poți mișca sau durerea a apărut după un accident, consultă urgent un medic.",
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
) {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "Ești Santix AI, un asistent medical educațional. Răspunzi strict pe baza contextului primit. Nu inventezi informații. Nu pui diagnostice finale. Recomanzi consult medical când e necesar. Răspunzi în română, clar și scurt. Nu folosi Markdown, simboluri de formatare sau liste cu liniuță.",
          },
          {
            role: "user",
            content: buildOllamaPrompt(input, context, previousMessages, route),
          },
        ],
        options: {
          temperature: 0.35,
          top_p: 0.9,
          num_predict: 420,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error ${response.status}: ${text}`);
    }

    const json = (await response.json()) as { message?: { content?: string } };
    const answer = json.message?.content?.trim();
    if (!answer) throw new Error("Ollama nu a întors conținut.");
    return answer;
  } finally {
    clearTimeout(timeout);
  }
}

export const askSelectionAi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<SelectionAiResponse> => {
    const supabase = createUserSupabaseClient(data.accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(data.accessToken);

    if (userError || !user) {
      throw new Error("Trebuie să fii logat pentru a folosi asistentul AI.");
    }

    let conversationId = data.conversationId;
    const route = classifyQuestion(data);
    const scope = inferSelectionScope(data);
    const structureSlug = await resolveExistingStructureSlug(supabase, scope);

    if (!conversationId) {
      const { data: conversation, error: conversationError } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          structure_slug: structureSlug,
          model_selection_id: scope.modelSelectionId,
          tissue: data.tissue,
          title: `Santix - ${data.structureName}`,
        })
        .select("id")
        .single();

      if (conversationError || !conversation) {
        throw new Error(conversationError?.message ?? "Nu am putut crea conversația AI.");
      }

      conversationId = conversation.id;
    }

    let selectionContext: KnowledgeEntry[] = [];
    if (route.category !== "out_of_scope" && route.category !== "app_specific") {
      selectionContext = await getSelectionContext(supabase, data, scope, structureSlug, route);
    }

    const baseContext =
      route.mode === "GENERAL_MEDICAL_MODE"
        ? await getGeneralMedicalContext(supabase, route, selectionContext)
        : route.category === "app_specific"
          ? []
          : selectionContext;
    const guardrailContext =
      route.category !== "out_of_scope" && route.category !== "app_specific"
        ? await getGuardrailContext(supabase)
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
    let answer = buildDbAnswer(data, context, (previousMessageCount ?? 0) === 0, route);
    const shouldUseDeterministicAnswer =
      route.category === "out_of_scope" ||
      route.category === "app_specific" ||
      (route.category !== "red_flag_or_urgent" && isVaguePainQuestion(data.question));

    try {
      if (!shouldUseDeterministicAnswer) {
        answer = await askOllama(data, context, previousMessages, route);
      }
    } catch (error) {
      console.warn("Ollama unavailable, using deterministic Santix answer:", error);
    }

    const { error: messageError } = await supabase.from("ai_messages").insert([
      {
        conversation_id: conversationId,
        role: "user",
        content_ro: data.question,
        retrieved_context: [{
          route: route.category,
          mode: route.mode,
          entities: route.entities,
        }],
      },
      {
        conversation_id: conversationId,
        role: "assistant",
        content_ro: answer,
        retrieved_context: {
          route: route.category,
          mode: route.mode,
          context: context.map((entry) => ({
            id: entry.id,
            category: entry.category,
            priority: entry.priority,
            source: entry.structure_slug ?? entry.model_selection_id ?? entry.body_region ?? "general",
          })),
        },
      },
    ]);

    if (messageError) {
      throw new Error(messageError.message);
    }

    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return {
      conversationId,
      answer,
      contextCount: context.length,
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
    };
  });
