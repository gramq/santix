import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Html, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LayerMode } from "./LayersToggle";
import {
  internalOrgans,
  type InternalOrgan,
  type OrganInteractionZone,
  type OrganModelPart,
} from "@/data/internalOrgans";

// Map submesh node names → bone IDs from src/data/bones.ts (used by FEMALE simple model)
const MESH_TO_BONE: Record<string, string> = {
  SM_HumanSkeleton_17: "frontal",
  SM_HumanSkeleton_18: "mandibula",
  SM_HumanSkeleton_13: "scapula",
  SM_HumanSkeleton_15: "scapula",
  SM_HumanSkeleton_10: "humerus",
  SM_HumanSkeleton_12: "humerus",
  SM_HumanSkeleton_08: "coaste",
  SM_HumanSkeleton_20: "vert-toracice",
  SM_HumanSkeleton_16: "coxal",
  SM_HumanSkeleton_14: "radius",
  SM_HumanSkeleton_19: "radius",
  SM_HumanSkeleton_04: "femur",
  SM_HumanSkeleton_05: "femur",
  SM_HumanSkeleton_06: "tibia",
  SM_HumanSkeleton_07: "tibia",
  SM_HumanSkeleton_03: "tars",
  SM_HumanSkeleton_09: "tars",
  SM_HumanSkeleton_01: "carp",
  SM_HumanSkeleton_02: "carp",
};

const MALE_COMPLEX_URL = "/anatomy/z-anatomy-musculoskeletal.glb?v=20260502-selection-2";
const FALLBACK_URL = "/skeleton.glb";
const HRA_ORGAN_TRANSFORM = {
  position: new THREE.Vector3(0, -0.44, -0.02),
  scale: new THREE.Vector3(3.15, 3.4, 2.65),
};
const BODY_REFERENCE = {
  height: 5.8,
  thoraxTop: 1.82,
  thoraxBottom: 0.58,
  diaphragm: 0.52,
  abdomenBottom: -0.2,
  pelvisCenter: -0.58,
  centerZ: 0.04,
  posteriorZ: -0.1,
};

const ANATOMICAL_ANCHORS: Record<OrganModelPart["anchor"], THREE.Vector3> = {
  "thoracic-cavity": new THREE.Vector3(0, 1.22, -0.05),
  "heart-mediastinum": new THREE.Vector3(0.05, 1.0, 0.08),
  "right-upper-abdomen": new THREE.Vector3(-0.12, 0.52, 0),
  "left-upper-abdomen": new THREE.Vector3(0.12, 0.48, 0.02),
  "retroperitoneal-pair": new THREE.Vector3(0, 0.34, -0.14),
  "retroperitoneal-left": new THREE.Vector3(0.17, 0.34, -0.14),
  "retroperitoneal-right": new THREE.Vector3(-0.17, 0.34, -0.14),
  "upper-abdomen-center": new THREE.Vector3(0, 0.42, -0.06),
  "spine-reference": new THREE.Vector3(0, 0.1, -0.15),
};

function bodyHalfWidthAtY(y: number) {
  if (y >= BODY_REFERENCE.thoraxBottom) return 0.46;
  if (y >= 0.18) return 0.42;
  if (y >= BODY_REFERENCE.abdomenBottom) return 0.38;
  return 0.24;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveAnatomicalPosition(model: OrganModelPart) {
  if (model.preserveScenePosition) {
    const offset = model.offset ? new THREE.Vector3(...model.offset) : new THREE.Vector3();
    return HRA_ORGAN_TRANSFORM.position.clone().add(offset);
  }

  const anchor = ANATOMICAL_ANCHORS[model.anchor].clone();
  const offset = model.offset ? new THREE.Vector3(...model.offset) : new THREE.Vector3();
  const position = anchor.add(offset);
  const targetHalfWidth = Math.min(Math.max(model.targetSize[0], model.targetSize[1]) * 0.42, 0.26);
  const bodyHalfWidth = bodyHalfWidthAtY(position.y);

  position.x = clamp(position.x, -bodyHalfWidth + targetHalfWidth, bodyHalfWidth - targetHalfWidth);
  position.z = clamp(position.z, -0.18, 0.18);

  return position;
}

function resolveAnatomicalScale(model: OrganModelPart, rawSize: THREE.Vector3) {
  if (model.preserveScenePosition) {
    return HRA_ORGAN_TRANSFORM.scale.clone();
  }

  const target = new THREE.Vector3(...model.targetSize);
  const safeSize = new THREE.Vector3(
    rawSize.x || 1,
    rawSize.y || rawSize.x || 1,
    rawSize.z || rawSize.x || 1,
  );

  if (model.scaleMode === "fit-box") {
    return new THREE.Vector3(
      target.x / safeSize.x,
      target.y / safeSize.y,
      target.z / safeSize.z,
    );
  }

  const uniformScale = Math.min(
    target.x / safeSize.x,
    target.y / safeSize.y,
    target.z / safeSize.z,
  );
  return new THREE.Vector3(uniformScale, uniformScale, uniformScale);
}

// Keep first paint light. The complex anatomy GLB is loaded only after the user opts in.
useGLTF.preload(FALLBACK_URL);
internalOrgans.forEach((organ) => {
  organ.modelParts?.forEach((part) => useGLTF.preload(part.url));
});

export type SkeletonSide = "male" | "female";
export type TissueType = "os" | "muschi" | "tendon" | "organ";
export type AnatomyModelMode = "simple" | "complex";

export interface BoneSelection {
  /** Bone id from src/data/bones.ts when known, otherwise a synthetic id (e.g. "muschi-grup-2"). */
  id: string;
  side: SkeletonSide;
  tissue: TissueType;
  /** Intuitive region used to highlight related tiny pieces together. */
  regionId?: string;
  regionLabel?: string;
  /** Display label (used when the selection is not a catalogued bone). */
  label?: string;
  /** Original English anatomical name, useful for stable classification/search. */
  labelEn?: string;
}

const HOVER_COLOR_BONE = new THREE.Color("#7b5cff");
const HOVER_COLOR_MUSCLE = new THREE.Color("#d91f7b");
const HOVER_COLOR_ORGAN = new THREE.Color("#00f2fe");
const SELECT_COLOR = new THREE.Color("#4a2fb7");
const SELECT_EMISSIVE = new THREE.Color("#c01874");
const DIM_COLOR = new THREE.Color("#e7ddf3");
const COMPLETE_REFERENCE_COLOR = new THREE.Color("#7fb7bd");

function isTissueLayerActive(tissue: TissueType | undefined, layerMode: LayerMode) {
  if (layerMode === "complete") return tissue === "os" || tissue === "muschi" || tissue === "tendon" || tissue === "organ";
  if (layerMode === "skeleton") return tissue === "os";
  if (layerMode === "muscles") return tissue === "muschi";
  if (layerMode === "organs") return tissue === "organ";
  return false;
}

function isTissueInteractive(tissue: TissueType | undefined, layerMode: LayerMode) {
  if (layerMode === "complete") return false;
  return isTissueLayerActive(tissue, layerMode);
}

function tissuePriority(tissue: TissueType | undefined, layerMode: LayerMode) {
  if (layerMode === "skeleton") return tissue === "os" ? 0 : 3;
  if (layerMode === "muscles") return tissue === "muschi" ? 0 : 3;
  if (layerMode === "organs") return tissue === "organ" ? 0 : 3;
  if (tissue === "organ") return 0;
  if (tissue === "muschi") return 0;
  if (tissue === "os") return 1;
  if (tissue === "tendon") return 2;
  return 3;
}

function completeLayerOpacity(tissue: TissueType | undefined) {
  if (tissue === "os") return 0.12;
  if (tissue === "muschi") return 0.07;
  if (tissue === "tendon") return 0.08;
  return 0.12;
}

function normalizeAnatomyName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasTerm(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function stripLateralityFromId(value: string) {
  return value.replace(/-(left|right)$/i, "");
}

function stripLateralityFromLabel(value: string) {
  return value
    .replace(/\s*\((stanga|stânga|dreapta|left|right)\)\s*$/i, "")
    .replace(/\b(stanga|stânga|dreapta|left|right)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function makeRegion(regionId: string, regionLabel: string) {
  return { regionId, regionLabel };
}

function makeCatalogSelection(id: string, label: string) {
  return { id, label };
}

function makeReadableSelection(id: string, label: string) {
  return { id: stripLateralityFromId(id), label };
}

function inferReadableMuscleSelection(input: {
  id?: string;
  label?: string;
  labelEn?: string;
}) {
  const name = normalizeAnatomyName([input.labelEn, input.label, input.id].filter(Boolean).join(" "));
  const fallbackId = stripLateralityFromId(input.id ?? `muschi-${name.replace(/[^a-z0-9]+/g, "-")}`);

  if (hasTerm(name, ["temporoparietalis"])) return makeReadableSelection(fallbackId, "Mușchiul temporoparietal");
  if (hasTerm(name, ["temporalis"])) return makeReadableSelection(fallbackId, "Mușchiul temporal");
  if (hasTerm(name, ["masseter"])) return makeReadableSelection(fallbackId, "Mușchiul maseter");
  if (hasTerm(name, ["buccinator", "bucinator"])) return makeReadableSelection(fallbackId, "Mușchiul buccinator");
  if (hasTerm(name, ["orbicularis oculi"])) return makeReadableSelection(fallbackId, "Mușchiul orbicular al ochiului");
  if (hasTerm(name, ["orbicularis oris"])) return makeReadableSelection(fallbackId, "Mușchiul orbicular al gurii");
  if (hasTerm(name, ["superior rectus muscle"])) return makeReadableSelection(fallbackId, "Mușchiul drept superior al ochiului");
  if (hasTerm(name, ["inferior rectus muscle"])) return makeReadableSelection(fallbackId, "Mușchiul drept inferior al ochiului");
  if (hasTerm(name, ["lateral rectus muscle"])) return makeReadableSelection(fallbackId, "Mușchiul drept lateral al ochiului");
  if (hasTerm(name, ["medial rectus muscle"])) return makeReadableSelection(fallbackId, "Mușchiul drept medial al ochiului");
  if (hasTerm(name, ["superior oblique muscle"])) return makeReadableSelection(fallbackId, "Mușchiul oblic superior al ochiului");
  if (hasTerm(name, ["inferior oblique muscle"])) return makeReadableSelection(fallbackId, "Mușchiul oblic inferior al ochiului");

  const rawLabel = stripLateralityFromLabel(input.label ?? input.labelEn ?? "Mușchi scheletic");
  const readableLabel = rawLabel
    .replace(/^muschiul\s+/i, "Mușchiul ")
    .replace(/^muschi\s+/i, "Mușchi ")
    .replace(/\bmuschiului\b/gi, "mușchiului")
    .replace(/\bmuschiul\b/gi, "mușchiul")
    .replace(/\bmuschi\b/gi, "mușchi")
    .trim();

  return makeReadableSelection(fallbackId, readableLabel || "Mușchi scheletic");
}

function inferCatalogSelection(input: {
  tissue: TissueType;
  id?: string;
  label?: string;
  labelEn?: string;
}) {
  const name = normalizeAnatomyName([input.labelEn, input.label, input.id].filter(Boolean).join(" "));
  if (input.tissue !== "os") return undefined;

  if (hasTerm(name, ["malleus"])) return makeCatalogSelection("ciocan", "Ciocane");
  if (hasTerm(name, ["incus"])) return makeCatalogSelection("nicovala", "Nicovale");
  if (hasTerm(name, ["stapes"])) return makeCatalogSelection("scarita", "Scărițe");
  if (hasTerm(name, ["hyoid"])) return makeCatalogSelection("hioid", "Os hioid");

  if (hasTerm(name, ["frontal"])) return makeCatalogSelection("frontal", "Os frontal");
  if (hasTerm(name, ["parietal"])) return makeCatalogSelection("parietal", "Oase parietale");
  if (hasTerm(name, ["temporal", "petrous"])) return makeCatalogSelection("temporal", "Oase temporale");
  if (hasTerm(name, ["occipital", "foramen magnum"])) return makeCatalogSelection("occipital", "Os occipital");
  if (hasTerm(name, ["sphenoid", "clinoid", "sella"])) return makeCatalogSelection("sfenoid", "Os sfenoid");
  if (hasTerm(name, ["ethmoid"])) return makeCatalogSelection("etmoid", "Os etmoid");

  if (hasTerm(name, ["maxilla", "maxillary", "infraorbital", "alveolar"])) return makeCatalogSelection("maxilar", "Maxilare");
  if (hasTerm(name, ["mandible", "mandibular", "mental foramen"])) return makeCatalogSelection("mandibula", "Mandibulă");
  if (hasTerm(name, ["zygomatic"])) return makeCatalogSelection("zigomatic", "Oase zigomatice");
  if (hasTerm(name, ["nasal"])) return makeCatalogSelection("nazal", "Oase nazale");
  if (hasTerm(name, ["lacrimal"])) return makeCatalogSelection("lacrimal", "Oase lacrimale");
  if (hasTerm(name, ["palatine"])) return makeCatalogSelection("palatin", "Oase palatine");
  if (hasTerm(name, ["vomer"])) return makeCatalogSelection("vomer", "Vomer");
  if (hasTerm(name, ["concha", "turbinate"])) return makeCatalogSelection("cornet-inf", "Cornete nazale inferioare");

  if (hasTerm(name, ["cervical", "atlas", "axis"])) return makeCatalogSelection("vert-cervicale", "Vertebre cervicale");
  if (hasTerm(name, ["thoracic", " t1", " t2", " t3", " t4", " t5", " t6", " t7", " t8", " t9", "t10", "t11", "t12"])) {
    return makeCatalogSelection("vert-toracice", "Vertebre toracice");
  }
  if (hasTerm(name, ["lumbar", " l1", " l2", " l3", " l4", " l5"])) return makeCatalogSelection("vert-lombare", "Vertebre lombare");
  if (hasTerm(name, ["sacrum", "sacral"])) return makeCatalogSelection("sacrum", "Sacrum");
  if (hasTerm(name, ["coccyx", "coccygeal"])) return makeCatalogSelection("coccis", "Coccis");

  if (hasTerm(name, ["sternum", "manubrium", "xiphoid"])) return makeCatalogSelection("stern", "Stern");
  if (hasTerm(name, ["rib", "costal"])) return makeCatalogSelection("coaste", "Coaste");
  if (hasTerm(name, ["clavicle", "clavicular"])) return makeCatalogSelection("clavicula", "Clavicule");
  if (hasTerm(name, ["scapula", "scapular", "acromion", "acromial", "coracoid", "glenoid", "supraspinous fossa", "infraspinous fossa"])) {
    return makeCatalogSelection("scapula", "Scapule");
  }

  if (hasTerm(name, ["humerus", "humeral", "trochlea", "capitulum", "olecranon fossa", "deltoid tuberosity"])) return makeCatalogSelection("humerus", "Humerus");
  if (hasTerm(name, ["radius", "radial"])) return makeCatalogSelection("radius", "Radius");
  if (hasTerm(name, ["ulna", "ulnar", "olecranon"])) return makeCatalogSelection("ulna", "Ulnă");
  if (hasTerm(name, ["carpal", "scaphoid", "lunate", "triquetrum", "pisiform", "trapezium", "trapezoid", "capitate", "hamate"])) {
    return makeCatalogSelection("carp", "Oase carpiene");
  }
  if (hasTerm(name, ["metacarpal"])) return makeCatalogSelection("metacarp", "Metacarpiene");
  if (hasTerm(name, ["phalanx of hand", "distal phalanx hand", "middle phalanx hand", "proximal phalanx hand"])) {
    return makeCatalogSelection("falange-mana", "Falange ale mâinii");
  }

  if (hasTerm(name, ["hip bone", "ilium", "ischium", "pubis", "acetabulum", "acetabular", "obturator", "iliac", "ischial", "pubic"])) {
    return makeCatalogSelection("coxal", "Oase coxale");
  }
  if (hasTerm(name, ["patella", "patellar"])) return makeCatalogSelection("rotula", "Rotulă");
  if (hasTerm(name, ["femur", "femoral", "trochanter", "linea aspera", "adductor tubercle"])) return makeCatalogSelection("femur", "Femur");
  if (hasTerm(name, ["tibia", "tibial", "intercondylar eminence"])) return makeCatalogSelection("tibia", "Tibia");
  if (hasTerm(name, ["fibula", "fibular"])) return makeCatalogSelection("fibula", "Fibulă");
  if (hasTerm(name, ["tarsal", "calcaneus", "talus", "cuboid", "cuneiform", "navicular"])) return makeCatalogSelection("tars", "Oase tarsiene");
  if (hasTerm(name, ["metatarsal"])) return makeCatalogSelection("metatars", "Metatarsiene");
  if (hasTerm(name, ["phalanx of foot", "distal phalanx foot", "middle phalanx foot", "proximal phalanx foot"])) {
    return makeCatalogSelection("falange-picior", "Falange ale piciorului");
  }

  return undefined;
}

function inferIntuitiveRegion(input: {
  tissue: TissueType;
  id?: string;
  label?: string;
  labelEn?: string;
}) {
  const name = normalizeAnatomyName([input.labelEn, input.label, input.id].filter(Boolean).join(" "));
  const prefix = input.tissue;

  if (input.tissue === "tendon") {
    if (hasTerm(name, ["plantar", "foot", "hallucis", "digiti minimi"])) {
      return makeRegion(`${prefix}:laba-piciorului`, "Laba piciorului");
    }
    if (hasTerm(name, ["palmar", "hand", "pollicis", "carpal", "finger", "digit"])) {
      return makeRegion(`${prefix}:mana`, "Mâna");
    }
    if (hasTerm(name, ["deltoid", "supraspinatus", "infraspinatus", "subscapularis"])) {
      return makeRegion(`${prefix}:umar`, "Umăr");
    }
    if (hasTerm(name, ["abdominal", "external abdominal oblique", "internal abdominal oblique", "rectus abdominis", "transversus abdominis"])) {
      return makeRegion(`${prefix}:abdomen`, "Abdomen");
    }
    return undefined;
  }

  if (input.tissue === "os") {
    if (hasTerm(name, ["carpal", "metacarpal", "phalanx of hand", "distal phalanx hand", "middle phalanx hand", "proximal phalanx hand"])) {
      return makeRegion(`${prefix}:schelet-mana`, "Scheletul mâinii");
    }
    if (hasTerm(name, ["tarsal", "metatarsal", "phalanx of foot", "calcaneus", "talus", "cuboid", "cuneiform", "navicular"])) {
      return makeRegion(`${prefix}:schelet-picior`, "Scheletul labei piciorului");
    }
    if (hasTerm(name, ["rib", "sternum", "manubrium", "xiphoid"])) {
      return makeRegion(`${prefix}:cutie-toracica`, "Cutia toracică");
    }
    if (hasTerm(name, ["vertebra", "atlas", "axis"])) {
      if (hasTerm(name, ["cervical", "atlas", "axis"])) return makeRegion(`${prefix}:coloana-cervicala`, "Coloana cervicală");
      if (hasTerm(name, ["thoracic", " t1", " t2", " t3", " t4", " t5", " t6", " t7", " t8", " t9", "t10", "t11", "t12"])) {
        return makeRegion(`${prefix}:coloana-toracala`, "Coloana toracală");
      }
      if (hasTerm(name, ["lumbar", " l1", " l2", " l3", " l4", " l5"])) return makeRegion(`${prefix}:coloana-lombara`, "Coloana lombară");
      return makeRegion(`${prefix}:coloana`, "Coloana vertebrală");
    }
    if (hasTerm(name, ["frontal", "parietal", "temporal", "occipital", "sphenoid", "ethmoid", "clinoid", "petrous", "foramen magnum", "cranial fossa"])) {
      return makeRegion(`${prefix}:craniu`, "Craniu");
    }
    if (hasTerm(name, ["maxilla", "mandible", "zygomatic", "nasal", "lacrimal", "palatine", "vomer", "concha", "orbital", "alveolar", "infraorbital", "mental foramen", "arytenoid", "laryngeal"])) {
      return makeRegion(`${prefix}:fata`, "Oasele feței");
    }
    if (hasTerm(name, ["malleus", "incus", "stapes"])) {
      return makeRegion(`${prefix}:ureche-medie`, "Oasele urechii medii");
    }
    if (hasTerm(name, ["hyoid"])) {
      return makeRegion(`${prefix}:hioid`, "Os hioid");
    }
    if (hasTerm(name, ["clavicle", "scapula", "acromion", "acromial", "coracoid", "glenoid", "supraspinous fossa", "infraspinous fossa"])) {
      return makeRegion(`${prefix}:centura-scapulara`, "Centura scapulară");
    }
    if (hasTerm(name, ["humerus", "humeral", "trochlea", "capitulum", "olecranon fossa", "anatomical neck", "surgical neck", "deltoid tuberosity"])) {
      return makeRegion(`${prefix}:brat`, "Scheletul brațului");
    }
    if (hasTerm(name, ["radius", "radial", "ulna", "ulnar", "olecranon", "styloid process of radius", "styloid process of ulna"])) {
      return makeRegion(`${prefix}:antebrat`, "Scheletul antebrațului");
    }
    if (hasTerm(name, ["hip bone", "ilium", "ischium", "pubis", "acetabulum", "acetabular", "obturator", "iliac", "ischial", "pubic", "sacral", "gluteal line"])) {
      return makeRegion(`${prefix}:bazin`, "Centura pelviană");
    }
    if (hasTerm(name, ["femur", "femoral", "patella", "patellar", "greater trochanter", "lesser trochanter", "linea aspera", "adductor tubercle", "intercondylar area"])) {
      return makeRegion(`${prefix}:coapsa`, "Scheletul coapsei");
    }
    if (hasTerm(name, ["tibia", "tibial", "fibula", "fibular", "malleolus", "intercondylar eminence"])) {
      return makeRegion(`${prefix}:gamba`, "Scheletul gambei");
    }
    return undefined;
  }

  if (hasTerm(name, ["temporoparietalis", "superior oblique muscle", "inferior oblique muscle", "superior rectus muscle", "inferior rectus muscle", "lateral rectus muscle", "medial rectus muscle", "orbicularis oculi", "trochlea of superior oblique"])) {
    return makeRegion(`${prefix}:muschii-capului-gatului`, "Mușchii capului și gâtului");
  }
  if (hasTerm(name, ["lumbrical", "interossei", "opponens", "palmar", "pollicis", "digiti minimi of hand", "thenar", "hypothenar"])) {
    return makeRegion(`${prefix}:muschii-mainii`, "Mușchii mâinii");
  }
  if (hasTerm(name, ["digitorum brevis", "hallucis brevis", "adductor hallucis", "abductor hallucis", "digiti minimi of foot", "plantar", "quadratus plantae", "foot"])) {
    return makeRegion(`${prefix}:muschii-piciorului`, "Mușchii labei piciorului");
  }
  if (hasTerm(name, ["digitorum longus", "hallucis longus", "tibialis", "fibularis", "gastrocnemius", "soleus", "plantaris", "popliteus", "compartment of leg"])) {
    return makeRegion(`${prefix}:muschii-gambei`, "Mușchii gambei");
  }
  if (hasTerm(name, ["sartorius", "rectus femoris", "vastus", "adductor", "gracilis", "biceps femoris", "semitendinosus", "semimembranosus", "tensor fasciae latae", "pectineus", "compartment of thigh"])) {
    return makeRegion(`${prefix}:muschii-coapsei`, "Mușchii coapsei");
  }
  if (
    hasTerm(name, [
      "forearm",
      "flexor carpi",
      "extensor carpi",
      "flexor digitorum superficialis",
      "flexor digitorum profundus",
      "extensor digitorum communis",
      "extensor digitorum muscle",
      "extensor indicis",
      "extensor digiti minimi of hand",
      "pronator",
      "supinator",
      "brachioradialis",
      "palmaris",
    ])
  ) {
    return makeRegion(`${prefix}:muschii-antebratului`, "Mușchii antebrațului");
  }
  if (hasTerm(name, ["compartment of arm", "biceps brachii", "brachialis", "coracobrachialis", "triceps brachii", "anconeus"])) {
    return makeRegion(`${prefix}:muschii-bratului`, "Mușchii brațului");
  }
  if (hasTerm(name, ["external abdominal oblique", "internal abdominal oblique", "rectus abdominis", "transversus abdominis", "pyramidalis", "quadratus lumborum"])) {
    return makeRegion(`${prefix}:muschii-abdomenului`, "Mușchii abdomenului");
  }
  if (hasTerm(name, ["pectoralis", "serratus anterior", "intercostal", "diaphragm", "subclavius", "transversus thoracis"])) {
    return makeRegion(`${prefix}:muschii-toracelui`, "Mușchii toracelui");
  }
  if (hasTerm(name, ["deltoid", "supraspinatus", "infraspinatus", "subscapularis", "teres major", "teres minor"])) {
    return makeRegion(`${prefix}:muschii-umarului`, "Mușchii umărului");
  }
  if (hasTerm(name, ["gluteus", "piriformis", "obturator", "gemellus", "quadratus femoris", "iliopsoas"])) {
    return makeRegion(`${prefix}:muschii-soldului`, "Mușchii șoldului");
  }
  if (hasTerm(name, ["bucinator", "buccinator", "corrugator", "depressor", "frontalis", "levator anguli", "levator labii", "levator nasolabialis", "masseter", "mentalis", "nasalis", "orbicularis", "pterygoid", "risorius", "temporalis", "zygomaticus", "sternocleidomastoid", "scalenus", "omohyoid", "sternohyoid", "thyrohyoid", "platysma", "digastric", "mylohyoid", "longus colli", "splenius", "semispinalis", "longissimus capitis", "pharyngeal constrictor", "common tendinous ring", "inferior tarsus"])) {
    return makeRegion(`${prefix}:muschii-capului-gatului`, "Mușchii capului și gâtului");
  }
  if (hasTerm(name, ["trapezius", "latissimus dorsi", "rhomboid", "levator scapulae", "erector spinae", "iliocostalis", "longissimus", "spinalis", "multifidus", "thoracolumbar"])) {
    return makeRegion(`${prefix}:muschii-spatelui`, "Mușchii spatelui");
  }
  if (hasTerm(name, ["levator ani", "iliopectineal arch", "pelvic floor"])) {
    return makeRegion(`${prefix}:muschii-bazinului`, "Mușchii bazinului");
  }

  return undefined;
}

// ----- Female (simple skeleton GLB) -----------------------------------------

interface SimpleSkeletonModelProps {
  url: string;
  fallbackUrl?: string;
  xOffset: number;
  label: string;
  side: SkeletonSide;
  variant: "matte" | "pearl";
  selection: BoneSelection | null;
  onSelect: (sel: BoneSelection | null) => void;
}

function useGLTFWithFallback(url: string, fallback: string) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        setResolvedUrl(r.ok ? url : fallback);
      })
      .catch(() => !cancelled && setResolvedUrl(fallback));
    return () => {
      cancelled = true;
    };
  }, [url, fallback]);
  return resolvedUrl;
}

function SimpleSkeletonModel(props: SimpleSkeletonModelProps) {
  const resolvedUrl = useGLTFWithFallback(props.url, props.fallbackUrl ?? props.url);
  if (!resolvedUrl) return null;
  return <ResolvedSimpleSkeletonModel {...props} url={resolvedUrl} />;
}

function ResolvedSimpleSkeletonModel({
  url,
  xOffset,
  label,
  side,
  variant,
  selection,
  onSelect,
}: SimpleSkeletonModelProps) {
  const gltf = useLoader(GLTFLoader, url);
  const groupRef = useRef<THREE.Group>(null);

  const baseColor = useMemo(
    () =>
      variant === "pearl"
        ? new THREE.Color("#f6f1e3")
        : new THREE.Color("#fbf6e9"),
    [variant],
  );

  const cloned = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      let cur: THREE.Object3D | null = obj;
      let boneId: string | null = null;
      while (cur) {
        const match = Object.keys(MESH_TO_BONE).find((k) => cur!.name.startsWith(k));
        if (match) {
          boneId = MESH_TO_BONE[match];
          break;
        }
        cur = cur.parent;
      }

      if (
        mesh.name.toLowerCase().includes("outline") ||
        (cur && cur.name.toLowerCase().includes("outline"))
      ) {
        mesh.visible = false;
        mesh.userData.boneId = null;
        return;
      }

      mesh.userData.boneId = boneId;
      mesh.userData.tissue = "os" as TissueType;
      mesh.userData.side = side;

      const mat = new THREE.MeshPhysicalMaterial({
        color: baseColor.clone(),
        roughness: variant === "pearl" ? 0.28 : 0.5,
        metalness: 0,
        clearcoat: variant === "pearl" ? 0.6 : 0.1,
        clearcoatRoughness: variant === "pearl" ? 0.25 : 0.6,
        sheen: variant === "pearl" ? 0.6 : 0,
        sheenColor: new THREE.Color("#e6e0ff"),
        sheenRoughness: 0.6,
        emissive: SELECT_COLOR.clone(),
        emissiveIntensity: 0,
        envMapIntensity: 1.2,
      });
      mesh.material = mat;
    });
    return root;
  }, [gltf, baseColor, variant, side]);

  useFrame(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const boneId = mesh.userData.boneId as string | null;
      if (!boneId) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const isSelected =
        selection !== null && selection.side === side && selection.id === boneId;
      const targetEmissive = isSelected ? 0.75 : 0;
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.18;
      const targetColor = isSelected ? SELECT_COLOR : baseColor;
      mat.color.lerp(targetColor, 0.18);
    });
    if (groupRef.current && !selection) {
      groupRef.current.rotation.y += 0.0012;
    }
  });

  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const targetHeight = 5.2;
    const s = targetHeight / (size.y || 1);
    return { scale: s, offset: new THREE.Vector3(-center.x, -center.y, -center.z) };
  }, [cloned]);

  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  useFrame(() => {
    const hovered = hoveredMeshRef.current;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const boneId = mesh.userData.boneId as string | null;
      if (!boneId) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const isSelected =
        selection !== null && selection.side === side && selection.id === boneId;
      if (isSelected) return;
      const isHov = hovered && (hovered.userData.boneId as string) === boneId;
      const targetColor = isHov ? HOVER_COLOR_BONE : baseColor;
      mat.color.lerp(targetColor, 0.18);
    });
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    const id = mesh.userData?.boneId as string | null;
    if (!id) return;
    hoveredMeshRef.current = mesh;
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hoveredMeshRef.current = null;
    document.body.style.cursor = "auto";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = (e.object.userData?.boneId as string | null) ?? null;
    if (id) onSelect({ id, side, tissue: "os" });
  };

  return (
    <group
      ref={groupRef}
      position={[xOffset, 0, 0]}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <primitive object={cloned} position={offset} />
    </group>
  );
}

// ----- Male (complex multi-layer anatomy GLB) --------------------------------

interface ComplexMaleProps {
  url: string;
  xOffset: number;
  layerMode: LayerMode;
  selection: BoneSelection | null;
  onSelect: (sel: BoneSelection | null) => void;
}

function ComplexMaleModel({ url, xOffset, layerMode, selection, onSelect }: ComplexMaleProps) {
  const gltf = useLoader(GLTFLoader, url);
  const groupRef = useRef<THREE.Group>(null);
  const layerModeRef = useRef(layerMode);

  const { cloned, layerMeshes } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const layerMeshes: Record<TissueType, THREE.Mesh[]> = { os: [], muschi: [], tendon: [], organ: [] };
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const tissue = ((mesh.userData.tissue as TissueType | undefined) ?? "muschi");
      const structureId =
        (mesh.userData.structureId as string | undefined) ??
        `${tissue}-${mesh.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const structureName =
        (mesh.userData.structureName as string | undefined) ??
        mesh.name.replace(/\.[a-z]+$/i, "").replace(/[()[\]]/g, "").trim();
      const structureNameEn = (mesh.userData.structureNameEn as string | undefined) ?? structureName;
      const catalogSelection = inferCatalogSelection({
        tissue,
        id: structureId,
        label: structureName,
        labelEn: structureNameEn,
      });
      const readableMuscleSelection =
        tissue === "muschi"
          ? inferReadableMuscleSelection({
              id: structureId,
              label: structureName,
              labelEn: structureNameEn,
            })
          : undefined;

      mesh.userData.tissue = tissue;
      mesh.userData.side = "male";
      mesh.userData.selectionLabelEn = structureNameEn;
      const intuitiveRegion = inferIntuitiveRegion({
        tissue,
        id: structureId,
        label: structureName,
        labelEn: structureNameEn,
      });
      const selectionId =
        catalogSelection?.id ??
        readableMuscleSelection?.id ??
        (tissue === "muschi" && intuitiveRegion?.regionId ? intuitiveRegion.regionId : structureId);
      const selectionLabel =
        catalogSelection?.label ??
        readableMuscleSelection?.label ??
        (tissue === "muschi" ? intuitiveRegion?.regionLabel : undefined) ??
        intuitiveRegion?.regionLabel ??
        stripLateralityFromLabel(structureName);

      mesh.userData.selectionId = selectionId;
      mesh.userData.selectionLabel = selectionLabel;
      mesh.userData.selectionRegionId = intuitiveRegion?.regionId ?? (catalogSelection ? `os:${catalogSelection.id}` : undefined);
      mesh.userData.selectionRegionLabel = intuitiveRegion?.regionLabel ?? catalogSelection?.label;

      const baseColor =
        tissue === "os"
          ? new THREE.Color("#f6ead2")
          : tissue === "muschi"
            ? new THREE.Color("#b23a32")
            : tissue === "organ"
              ? new THREE.Color("#00d8e8")
              : new THREE.Color("#ead2ad");

      const mat = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: tissue === "os" ? 0.42 : tissue === "muschi" ? 0.58 : 0.55,
        metalness: 0,
        clearcoat: tissue === "muschi" ? 0.2 : 0.16,
        clearcoatRoughness: 0.45,
        emissive: SELECT_EMISSIVE.clone(),
        emissiveIntensity: 0,
        transparent: true,
        opacity: tissue === "muschi" ? 0.62 : tissue === "tendon" ? 0.72 : tissue === "organ" ? 0.88 : 1,
        depthWrite: tissue === "os",
        envMapIntensity: 1.1,
        side: THREE.DoubleSide,
      });
      mat.userData.baseColor = baseColor.clone();
      mat.userData.baseOpacity = mat.opacity;
      mesh.material = mat;
      if (tissue === "organ") {
        mesh.raycast = () => null;
      }
      layerMeshes[tissue].push(mesh);
    });
    return { cloned: root, layerMeshes };
  }, [gltf]);

  // Apply exclusive layer visibility.
  useEffect(() => {
    layerModeRef.current = layerMode;
    layerMeshes.os.forEach((m) => (m.visible = isTissueLayerActive("os", layerMode)));
    layerMeshes.muschi.forEach((m) => (m.visible = isTissueLayerActive("muschi", layerMode)));
    layerMeshes.tendon.forEach((m) => (m.visible = isTissueLayerActive("tendon", layerMode)));
    layerMeshes.organ.forEach((m) => (m.visible = false));
  }, [layerMode, layerMeshes]);

  useEffect(() => {
    if (selection?.side !== "male") return;
    if (!isTissueInteractive(selection.tissue, layerMode)) {
      onSelect(null);
    }
  }, [layerMode, onSelect, selection]);

  // Center & scale to a calm anatomy-viewer size without changing the authored orientation.
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const targetHeight = 5.8;
    const s = targetHeight / (size.y || size.z || 1);
    return { scale: s, offset: new THREE.Vector3(-center.x, -center.y, -center.z) };
  }, [cloned]);

  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);

  useFrame(() => {
    const hovered = hoveredMeshRef.current;
    const hasSelection = selection !== null && selection.side === "male";
    const isCompleteLayer = layerModeRef.current === "complete";
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const baseColor = (mat.userData.baseColor as THREE.Color) ?? mat.color;
      const baseOpacity = (mat.userData.baseOpacity as number | undefined) ?? mat.opacity;
      const tissue = mesh.userData.tissue as TissueType;
      const selectionId = mesh.userData.selectionId as string | undefined;
      const selectionRegionId = mesh.userData.selectionRegionId as string | undefined;

      const isSelected =
        !isCompleteLayer &&
        selection !== null &&
        selection.side === "male" &&
        (selection.id === selectionId ||
          (!!selection.regionId && selection.regionId === selectionRegionId));
      const isHov =
        !isCompleteLayer &&
        !!selectionId &&
        hovered !== null &&
        hovered.userData.selectionId === selectionId &&
        !isSelected;

      mesh.renderOrder = isCompleteLayer ? -10 : isSelected ? 10 : 0;
      mat.depthWrite = isCompleteLayer ? false : isSelected || (!hasSelection && tissue === "os");
      mat.depthTest = true;

      const targetOpacity = isCompleteLayer
        ? completeLayerOpacity(tissue)
        : isSelected
          ? 1
          : hasSelection
            ? tissue === "os"
              ? 0.18
              : tissue === "muschi"
                ? 0.12
                : 0.1
            : isHov
              ? Math.min(1, baseOpacity + 0.2)
              : baseOpacity;
      mat.opacity += (targetOpacity - mat.opacity) * 0.22;

      const targetEmissive = isCompleteLayer ? 0 : isSelected ? 1.35 : isHov ? 0.2 : 0;
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.18;

      const hoverColor = tissue === "muschi" ? HOVER_COLOR_MUSCLE : HOVER_COLOR_BONE;
      const targetColor = isCompleteLayer
        ? COMPLETE_REFERENCE_COLOR
        : isSelected
          ? SELECT_COLOR
          : hasSelection
            ? DIM_COLOR
            : isHov
              ? hoverColor
              : baseColor;
      mat.color.lerp(targetColor, 0.18);
    });

    if (groupRef.current && !selection) {
      groupRef.current.rotation.y += 0.0012;
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (layerModeRef.current === "complete") {
      hoveredMeshRef.current = null;
      document.body.style.cursor = "auto";
      return;
    }
    e.stopPropagation();
    const mesh =
      e.intersections
        .map((intersection) => intersection.object as THREE.Mesh)
        .filter((candidate) => {
          const tissue = candidate.userData?.tissue as TissueType | undefined;
          return !!candidate.userData?.selectionId && isTissueInteractive(tissue, layerModeRef.current);
        })
        .sort(
          (a, b) =>
            tissuePriority(a.userData?.tissue as TissueType | undefined, layerModeRef.current) -
            tissuePriority(b.userData?.tissue as TissueType | undefined, layerModeRef.current),
        )[0] ?? null;
    if (!mesh) return;
    hoveredMeshRef.current = mesh;
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (layerModeRef.current === "complete") {
      hoveredMeshRef.current = null;
      document.body.style.cursor = "auto";
      return;
    }
    e.stopPropagation();
    hoveredMeshRef.current = null;
    document.body.style.cursor = "auto";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (layerModeRef.current === "complete") return;
    e.stopPropagation();
    const mesh =
      e.intersections
        .map((intersection) => intersection.object as THREE.Mesh)
        .filter((candidate) => {
          const tissue = candidate.userData?.tissue as TissueType | undefined;
          return !!candidate.userData?.selectionId && isTissueInteractive(tissue, layerModeRef.current);
        })
        .sort(
          (a, b) =>
            tissuePriority(a.userData?.tissue as TissueType | undefined, layerModeRef.current) -
            tissuePriority(b.userData?.tissue as TissueType | undefined, layerModeRef.current),
        )[0] ?? null;
    if (!mesh) return;
    const tissue = mesh.userData?.tissue as TissueType | undefined;
    const id = mesh.userData?.selectionId as string | undefined;
    const label = mesh.userData?.selectionLabel as string | undefined;
    const labelEn = mesh.userData?.selectionLabelEn as string | undefined;
    const regionId = mesh.userData?.selectionRegionId as string | undefined;
    const regionLabel = mesh.userData?.selectionRegionLabel as string | undefined;
    if (!tissue || !id) return;
    onSelect({
      id,
      side: "male",
      tissue,
      regionId,
      regionLabel,
      label,
      labelEn,
    });
  };
  const isComplexModelInteractive = layerMode !== "organs" && layerMode !== "complete";

  return (
    <group
      ref={groupRef}
      position={[xOffset, 0, 0]}
      scale={scale}
      visible={layerMode !== "organs"}
      onPointerOver={isComplexModelInteractive ? handlePointerOver : undefined}
      onPointerOut={isComplexModelInteractive ? handlePointerOut : undefined}
      onClick={isComplexModelInteractive ? handleClick : undefined}
    >
      <primitive object={cloned} position={offset} />
    </group>
  );
}

function AnatomyGlbModel({
  organ,
  model,
  selected = false,
  hovered = false,
  dimmed = false,
  opacity = 0.42,
  interactive = true,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  organ?: InternalOrgan;
  model: OrganModelPart;
  selected?: boolean;
  hovered?: boolean;
  dimmed?: boolean;
  opacity?: number;
  interactive?: boolean;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const gltf = useGLTF(model.url);
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.Material[]>([]);
  const baseColor = useMemo(() => new THREE.Color(organ?.color ?? COMPLETE_REFERENCE_COLOR), [organ?.color]);
  const glowColor = useMemo(() => new THREE.Color(organ?.emissiveColor ?? "#00f2fe"), [organ?.emissiveColor]);

  const { scene, centerOffset, targetPosition, targetScale } = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const materials: THREE.Material[] = [];

    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMaterials = originalMaterials.map((sourceMaterial) => {
        const clonedMaterial = sourceMaterial.clone();
        clonedMaterial.transparent = true;
        clonedMaterial.opacity = opacity;
        clonedMaterial.depthTest = true;
        clonedMaterial.depthWrite = false;
        clonedMaterial.side = THREE.DoubleSide;
        clonedMaterial.toneMapped = false;

        const standardMaterial = clonedMaterial as THREE.MeshStandardMaterial;
        if ("color" in standardMaterial) {
          standardMaterial.color = baseColor.clone();
          standardMaterial.roughness = Math.max(standardMaterial.roughness ?? 0.4, 0.48);
          standardMaterial.metalness = 0;
        }
        if ("map" in standardMaterial) {
          standardMaterial.map = null;
          standardMaterial.needsUpdate = true;
        }
        if ("emissive" in standardMaterial) {
          standardMaterial.emissive = glowColor.clone();
          standardMaterial.emissiveIntensity = organ ? 0.08 : 0.04;
        }

        materials.push(clonedMaterial);
        return clonedMaterial;
      });

      mesh.material = Array.isArray(mesh.material) ? clonedMaterials : clonedMaterials[0];
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = organ ? 34 : 18;
      if (!interactive) mesh.raycast = () => null;
    });

    materialsRef.current = materials;

    const box = new THREE.Box3().setFromObject(cloned);
    const center = model.preserveScenePosition
      ? new THREE.Vector3()
      : box.getCenter(new THREE.Vector3()).multiplyScalar(-1);
    const size = box.getSize(new THREE.Vector3());
    const scale = resolveAnatomicalScale(model, size);
    if (model.mirrorX) scale.x *= -1;

    return {
      scene: cloned,
      centerOffset: center,
      targetPosition: resolveAnatomicalPosition(model),
      targetScale: scale,
    };
  }, [baseColor, gltf.scene, glowColor, interactive, model, opacity, organ]);

  const initialPosition = useMemo(
    () => targetPosition.clone().add(new THREE.Vector3(0, -0.08, 0)),
    [targetPosition],
  );
  const initialScale = useMemo(() => targetScale.clone().multiplyScalar(0.72), [targetScale]);
  const targetRotation = useMemo(
    () => new THREE.Euler(...(model.rotation ?? [0, 0, 0])),
    [model.rotation],
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(initialPosition);
    group.scale.copy(initialScale);
    group.rotation.copy(targetRotation);
  }, [initialPosition, initialScale, targetRotation]);

  useFrame(() => {
    const group = groupRef.current;
    if (group) {
      group.position.lerp(targetPosition, 0.12);
      group.scale.lerp(targetScale, 0.12);
      group.rotation.x += (targetRotation.x - group.rotation.x) * 0.12;
      group.rotation.y += (targetRotation.y - group.rotation.y) * 0.12;
      group.rotation.z += (targetRotation.z - group.rotation.z) * 0.12;
    }

    materialsRef.current.forEach((material) => {
      const targetOpacity = selected ? 0.82 : hovered ? 0.72 : dimmed ? 0.18 : opacity;
      material.opacity += (targetOpacity - material.opacity) * 0.18;

      const standardMaterial = material as THREE.MeshStandardMaterial;
      if ("emissive" in standardMaterial) {
        standardMaterial.color.lerp(selected || hovered ? baseColor.clone().lerp(new THREE.Color("#ffffff"), 0.18) : baseColor, 0.08);
        standardMaterial.emissive.lerp(selected || hovered ? glowColor : baseColor, 0.08);
        standardMaterial.emissiveIntensity +=
          ((selected ? 0.46 : hovered ? 0.28 : dimmed ? 0.02 : organ ? 0.08 : 0.04) - standardMaterial.emissiveIntensity) *
          0.18;
      }
    });
  });

  return (
    <group
      ref={groupRef}
      position={initialPosition}
      scale={initialScale}
      rotation={model.rotation ?? [0, 0, 0]}
      renderOrder={organ ? 34 : 18}
      onPointerOver={interactive ? onPointerOver : undefined}
      onPointerOut={interactive ? onPointerOut : undefined}
      onClick={interactive ? onClick : undefined}
    >
      <primitive object={scene} position={centerOffset} />
    </group>
  );
}

function OrganInteractionZoneMesh({
  zone,
  selected,
  hovered,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  zone: OrganInteractionZone;
  selected: boolean;
  hovered: boolean;
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (event: ThreeEvent<PointerEvent>) => void;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const rotation = zone.rotation ?? [0, 0, 0];

  return (
    <mesh
      position={zone.position}
      rotation={rotation}
      scale={zone.kind === "ellipsoid" ? [zone.size[0] / 2, zone.size[1] / 2, zone.size[2] / 2] : [1, 1, 1]}
      renderOrder={selected || hovered ? 80 : 10}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {zone.kind === "ellipsoid" ? (
        <sphereGeometry args={[1, 24, 16]} />
      ) : (
        <boxGeometry args={zone.size} />
      )}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

function InternalOrgansLayer({
  layerMode,
  selection,
  onSelect,
}: {
  layerMode: LayerMode;
  selection: BoneSelection | null;
  onSelect: (sel: BoneSelection | null) => void;
}) {
  const [hoveredOrganId, setHoveredOrganId] = useState<string | null>(null);

  if (layerMode !== "organs" && layerMode !== "complete") return null;

  return (
    <group renderOrder={50}>
      {internalOrgans.filter((organ) => organ.modelParts?.length).map((organ) => {
        const selected = selection?.tissue === "organ" && selection.id === organ.id;
        const hovered = hoveredOrganId === organ.id;
        const isInteractive = layerMode === "organs";
        const hasFocusedOrgan = isInteractive && Boolean(hoveredOrganId || selection?.tissue === "organ");
        const dimmed = hasFocusedOrgan && !selected && !hovered;
        const organOpacity = layerMode === "complete" ? 0.24 : 0.42;
        const selectOrgan = () =>
          onSelect({
            id: organ.id,
            side: "male",
            tissue: "organ",
            regionId: organ.bodyRegion,
            regionLabel: organ.category,
            label: organ.name,
            labelEn: organ.latinName,
          });
        const handleOrganPointerOver = (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          if (isInteractive) {
            setHoveredOrganId(organ.id);
            document.body.style.cursor = "pointer";
          }
        };
        const handleOrganPointerOut = (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          setHoveredOrganId((current) => (current === organ.id ? null : current));
          document.body.style.cursor = "auto";
        };
        const handleOrganClick = (event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          if (isInteractive) selectOrgan();
        };
        return (
          <group
            key={organ.id}
            onPointerOver={handleOrganPointerOver}
            onPointerOut={handleOrganPointerOut}
            onClick={handleOrganClick}
          >
            {organ.modelParts?.map((model, index) => (
              <AnatomyGlbModel
                key={`${organ.id}-model-${index}`}
                organ={organ}
                model={model}
                selected={selected}
                hovered={hovered}
                dimmed={dimmed}
                opacity={organOpacity}
                interactive={isInteractive}
                onPointerOver={handleOrganPointerOver}
                onPointerOut={handleOrganPointerOut}
                onClick={handleOrganClick}
              />
            ))}
            {isInteractive &&
              organ.interactionZones?.map((zone, index) => (
                <OrganInteractionZoneMesh
                  key={`${organ.id}-hit-${index}`}
                  zone={zone}
                  selected={selected}
                  hovered={hovered}
                  onPointerOver={handleOrganPointerOver}
                  onPointerOut={handleOrganPointerOut}
                  onClick={handleOrganClick}
                />
              ))}
          </group>
        );
      })}
    </group>
  );
}

function LoadingFallback() {
  const { progress } = useProgress();
  const roundedProgress = Math.round(progress);
  return (
    <Html center>
      <div className="min-w-[240px] rounded-2xl border border-primary/20 bg-black/70 px-4 py-3 text-center shadow-[0_0_32px_rgba(0,242,254,0.14)] backdrop-blur-md">
        <div className="text-sm font-bold tracking-tight text-primary">
          Se încarcă modelul anatomic
        </div>
        <div className="mt-1 text-[11px] font-medium text-muted-foreground">
          {roundedProgress > 0 ? `${roundedProgress}%` : "Pregătire model 3D..."}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${Math.max(roundedProgress, 8)}%` }}
          />
        </div>
      </div>
    </Html>
  );
}

interface SkeletonSceneProps {
  selection: BoneSelection | null;
  onSelect: (sel: BoneSelection | null) => void;
  layerMode: LayerMode;
  mode: AnatomyModelMode;
}

export function SkeletonScene({ selection, onSelect, layerMode, mode }: SkeletonSceneProps) {
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsLightMode(document.documentElement.classList.contains("light-mode"));
    };
    syncTheme();
    window.addEventListener("santix-theme-change", syncTheme);
    return () => window.removeEventListener("santix-theme-change", syncTheme);
  }, []);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.15, 10], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={[isLightMode ? "#eef7f8" : "#03090b"]} />
      <fog attach="fog" args={[isLightMode ? "#dff4f6" : "#051318", 9, 22]} />

      <hemisphereLight args={[isLightMode ? "#ffffff" : "#dffcff", isLightMode ? "#c9e8ec" : "#061014", isLightMode ? 1.05 : 0.95]} />
      <ambientLight intensity={isLightMode ? 0.58 : 0.42} />
      <directionalLight
        position={[5, 8, 7]}
        intensity={isLightMode ? 1.22 : 1.12}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 5, 5]} intensity={isLightMode ? 0.6 : 0.5} color="#dffcff" />
      <directionalLight position={[0, 4, -8]} intensity={isLightMode ? 0.5 : 0.72} color="#00f2fe" />
      <pointLight position={[0, 2.5, 5]} intensity={isLightMode ? 0.22 : 0.34} color="#00f2fe" />

      <Suspense fallback={<LoadingFallback />}>
        {mode === "complex" ? (
          <>
            <ComplexMaleModel
              url={MALE_COMPLEX_URL}
              xOffset={0}
              layerMode={layerMode}
              selection={selection}
              onSelect={onSelect}
            />
            <InternalOrgansLayer
              layerMode={layerMode}
              selection={selection}
              onSelect={onSelect}
            />
          </>
        ) : (
          <SimpleSkeletonModel
            url={FALLBACK_URL}
            xOffset={0}
            label="Mod rapid"
            side="male"
            variant="matte"
            selection={selection}
            onSelect={onSelect}
          />
        )}
        <ContactShadows
          position={[0, -2.9, 0]}
          opacity={isLightMode ? 0.16 : 0.22}
          scale={8}
          blur={2.2}
          far={5}
          color={isLightMode ? "#7bcbd4" : "#00b7c7"}
        />
        <Environment preset="studio" environmentIntensity={0.7} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={5.8}
        maxDistance={15}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.6}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
