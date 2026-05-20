import type { TissueType } from "@/components/skeleton/SkeletonScene";

export interface AnatomyCurriculumInfo {
  system: string;
  segment: string;
  group: string;
  subgroup?: string;
  aspect?: string;
  functionHint: string;
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferAspect(name: string): string {
  if (hasAny(name, ["clavicular part of deltoid", "pectoralis", "sternum", "manubrium", "xiphoid"])) {
    return "Fata anterioara";
  }

  if (
    hasAny(name, [
      "scapular spinal part of deltoid",
      "infraspinatus",
      "teres major",
      "teres minor",
      "triceps",
      "anconeus",
      "rhomboid",
      "trapezius",
      "latissimus dorsi",
      "occipital",
      "posterior",
      "dorsal",
      "extensor",
      "gluteus",
      "biceps femoris",
      "semitendinosus",
      "semimembranosus",
      "gastrocnemius",
      "soleus",
    ])
  ) {
    return "Fata posterioara";
  }

  if (
    hasAny(name, [
      "anterior",
      "frontal",
      "biceps brachii",
      "brachialis",
      "coracobrachialis",
      "flexor",
      "pronator",
      "rectus",
      "sartorius",
      "vastus",
      "tibialis anterior",
    ])
  ) {
    return "Fata anterioara";
  }

  if (hasAny(name, ["lateral", "acromial part of deltoid", "fibularis", "zygomatic", "temporal"])) {
    return "Fata laterala";
  }

  if (hasAny(name, ["medial", "adductor", "gracilis", "ulna", "palatine", "vomer"])) {
    return "Fata mediala";
  }

  if (hasAny(name, ["deep", "profund", "subscapularis", "multifidus", "interossei"])) {
    return "Plan profund";
  }

  return "Plan general";
}

function withAspect(info: AnatomyCurriculumInfo, name: string): AnatomyCurriculumInfo {
  return {
    ...info,
    aspect: info.aspect ?? inferAspect(name),
  };
}

function muscleInfo(name: string): AnatomyCurriculumInfo {
  if (
    hasAny(name, [
      "occipitalis",
      "splenius",
      "rectus posterior",
      "obliquus superior capitis",
      "obliquus inferior capitis",
      "semispinalis",
      "longissimus capitis",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Cap si gat",
      group: "Muschii cefei",
      subgroup: "Plan posterior",
      aspect: "Fata posterioara",
      functionHint: "Participa la extensia, rotatia si stabilizarea capului si gatului.",
    };
  }

  if (
    hasAny(name, [
      "frontalis",
      "occipitalis",
      "temporalis",
      "masseter",
      "orbicularis",
      "zygomaticus",
      "buccinator",
      "mentalis",
      "risorius",
      "nasalis",
      "pterygoid",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Cap",
      group: "Muschii capului",
      subgroup: hasAny(name, ["masseter", "temporalis", "pterygoid"])
        ? "Muschii masticatori"
        : "Muschii mimicii",
      functionHint: "Participa la mimica fetei sau la masticatie.",
    };
  }

  if (
    hasAny(name, [
      "sternocleidomastoid",
      "scalenus",
      "omohyoid",
      "sternohyoid",
      "sternothyroid",
      "thyrohyoid",
      "longus colli",
      "platysma",
      "digastric",
      "mylohyoid",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Gat",
      group: "Muschii gatului",
      subgroup: "Regiunea anterolaterala si planurile profunde",
      functionHint: "Ajuta la miscarile capului, gatului si la stabilizarea regiunii cervicale.",
    };
  }

  if (
    hasAny(name, [
      "trapezius",
      "latissimus dorsi",
      "rhomboid",
      "levator scapulae",
      "splenius",
      "iliocostalis",
      "longissimus",
      "spinalis",
      "multifidus",
      "thoracolumbar",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Trunchi",
      group: "Muschii spatelui si ai cefei",
      subgroup: "Plan superficial si planuri profunde",
      functionHint: "Sustin postura si participa la miscarile trunchiului, capului si centurii scapulare.",
    };
  }

  if (
    hasAny(name, [
      "pectoralis",
      "serratus anterior",
      "intercostal",
      "subclavius",
      "transversus thoracis",
      "diaphragm",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Trunchi",
      group: "Muschii anterolaterali ai toracelui",
      subgroup: hasAny(name, ["intercostal", "diaphragm"])
        ? "Muschii respiratori"
        : "Muschii peretelui toracic",
      functionHint: "Contribuie la miscarile toracelui, respiratie si stabilizarea umarului.",
    };
  }

  if (
    hasAny(name, [
      "rectus abdominis",
      "oblique",
      "transversus abdominis",
      "pyramidalis",
      "quadratus lumborum",
      "linea alba",
      "inguinal ligament",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Trunchi",
      group: "Muschii anterolaterali ai abdomenului",
      subgroup: "Peretele abdominal",
      functionHint: "Sustin peretele abdominal si participa la flexia, rotatia si stabilizarea trunchiului.",
    };
  }

  if (
    hasAny(name, [
      "deltoid",
      "supraspinatus",
      "infraspinatus",
      "subscapularis",
      "teres major",
      "teres minor",
    ])
  ) {
    const shoulderSubgroup = hasAny(name, ["clavicular part of deltoid", "subscapularis"])
      ? "Umar anterior"
      : hasAny(name, ["scapular spinal part of deltoid", "infraspinatus", "teres major", "teres minor"])
        ? "Umar posterior"
        : hasAny(name, ["acromial part of deltoid", "supraspinatus"])
          ? "Umar lateral/superior"
          : "Centura scapulara si articulatia umarului";

    return {
      system: "Sistem muscular",
      segment: "Membru superior",
      group: "Muschii umarului",
      subgroup: shoulderSubgroup,
      aspect: shoulderSubgroup.includes("posterior")
        ? "Fata posterioara"
        : shoulderSubgroup.includes("anterior")
          ? "Fata anterioara"
          : shoulderSubgroup.includes("lateral")
            ? "Fata laterala"
            : undefined,
      functionHint: "Mobilizeaza si stabilizeaza umarul.",
    };
  }

  if (
    hasAny(name, [
      "biceps brachii",
      "brachialis",
      "coracobrachialis",
      "triceps brachii",
      "anconeus",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Membru superior",
      group: "Muschii bratului",
      subgroup: hasAny(name, ["triceps", "anconeus"]) ? "Loja posterioara" : "Loja anterioara",
      functionHint: "Realizeaza miscari ale bratului si antebratului, mai ales flexie sau extensie.",
    };
  }

  if (
    hasAny(name, [
      "pronator",
      "supinator",
      "flexor carpi",
      "extensor carpi",
      "flexor digitorum",
      "extensor digitorum",
      "brachioradialis",
      "palmaris",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Membru superior",
      group: "Muschii antebratului",
      subgroup: hasAny(name, ["flexor", "pronator"]) ? "Grup anterior" : "Grup posterior/lateral",
      functionHint: "Controleaza miscarile antebratului, mainii si degetelor.",
    };
  }

  if (hasAny(name, ["pollicis", "lumbrical", "interossei", "opponens", "palmar", "digiti minimi of hand"])) {
    return {
      system: "Sistem muscular",
      segment: "Membru superior",
      group: "Muschii mainii",
      subgroup: "Fata palmara si spatiile interosoase",
      functionHint: "Permit miscari fine ale degetelor si prizei mainii.",
    };
  }

  if (hasAny(name, ["gluteus", "piriformis", "gemellus", "obturator", "quadratus femoris", "iliopsoas"])) {
    return {
      system: "Sistem muscular",
      segment: "Membru inferior",
      group: "Muschii bazinului",
      subgroup: "Regiunea soldului",
      functionHint: "Stabilizeaza soldul si participa la miscarile coapsei.",
    };
  }

  if (
    hasAny(name, [
      "sartorius",
      "rectus femoris",
      "vastus",
      "adductor",
      "gracilis",
      "biceps femoris",
      "semitendinosus",
      "semimembranosus",
      "tensor fasciae latae",
      "pectineus",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Membru inferior",
      group: "Muschii coapsei",
      subgroup: hasAny(name, ["biceps femoris", "semitendinosus", "semimembranosus"])
        ? "Loja posterioara"
        : hasAny(name, ["adductor", "gracilis", "pectineus"])
          ? "Loja mediala"
          : "Loja anterioara",
      functionHint: "Participa la miscarile coapsei, genunchiului si la locomotie.",
    };
  }

  if (
    hasAny(name, [
      "tibialis",
      "fibularis",
      "gastrocnemius",
      "soleus",
      "plantaris",
      "popliteus",
      "extensor hallucis",
      "flexor hallucis",
    ])
  ) {
    return {
      system: "Sistem muscular",
      segment: "Membru inferior",
      group: "Muschii gambei",
      subgroup: hasAny(name, ["tibialis anterior", "extensor"])
        ? "Loja anterolaterala"
        : "Loja posterioara",
      functionHint: "Controleaza miscarile gambei, labei piciorului si degetelor.",
    };
  }

  if (hasAny(name, ["hallucis", "digiti minimi of foot", "plantar", "foot", "quadratus plantae"])) {
    return {
      system: "Sistem muscular",
      segment: "Membru inferior",
      group: "Muschii piciorului",
      subgroup: "Fata dorsala si fata plantara",
      functionHint: "Sustin bolta plantara si miscarile degetelor piciorului.",
    };
  }

  return {
    system: "Sistem muscular",
    segment: "Corp",
    group: "Muschii scheletici",
    subgroup: "Incadrare generala",
    functionHint: "Muschii scheletici sunt componenta activa a miscarii.",
  };
}

function boneInfo(name: string): AnatomyCurriculumInfo {
  if (
    hasAny(name, [
      "frontal",
      "parietal",
      "temporal",
      "occipital",
      "sphenoid",
      "ethmoid",
      "maxilla",
      "mandible",
      "zygomatic",
      "nasal",
      "lacrimal",
      "palatine",
      "vomer",
    ])
  ) {
    const cranialSubgroup = hasAny(name, ["occipital"])
      ? "Neurocraniu - regiunea posterioara"
      : hasAny(name, ["frontal"])
        ? "Neurocraniu - regiunea anterioara"
        : hasAny(name, ["parietal"])
          ? "Neurocraniu - regiunea superolaterala"
          : hasAny(name, ["temporal"])
            ? "Neurocraniu - regiunea laterala"
            : hasAny(name, ["maxilla", "mandible", "zygomatic", "nasal", "lacrimal", "palatine", "vomer"])
              ? "Viscerocraniu"
              : "Neurocraniu";

    return {
      system: "Sistem osos",
      segment: "Cap",
      group: "Scheletul capului",
      subgroup: cranialSubgroup,
      aspect: cranialSubgroup.includes("posterioara")
        ? "Fata posterioara"
        : cranialSubgroup.includes("anterioara")
          ? "Fata anterioara"
          : cranialSubgroup.includes("laterala")
            ? "Fata laterala"
            : undefined,
      functionHint: "Protejeaza encefalul si formeaza suportul fetei.",
    };
  }

  if (hasAny(name, ["vertebra", "atlas", "axis", "sacrum", "coccyx"])) {
    return {
      system: "Sistem osos",
      segment: "Trunchi",
      group: "Coloana vertebrala",
      subgroup: hasAny(name, ["cervical", "atlas", "axis"])
        ? "Regiunea cervicala"
        : hasAny(name, ["thoracic", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12"])
          ? "Regiunea toracala"
          : hasAny(name, ["lumbar", "l1", "l2", "l3", "l4", "l5"])
            ? "Regiunea lombara"
            : "Regiunea sacrala/coccigiana",
      functionHint: "Sustine corpul, protejeaza maduva spinarii si permite miscari ale trunchiului.",
    };
  }

  if (hasAny(name, ["rib", "sternum", "manubrium", "xiphoid"])) {
    return {
      system: "Sistem osos",
      segment: "Trunchi",
      group: "Scheletul toracelui",
      subgroup: hasAny(name, ["rib"]) ? "Coaste" : "Stern",
      functionHint: "Protejeaza inima si plamanii si participa la mecanica respiratiei.",
    };
  }

  if (hasAny(name, ["hip bone", "ilium", "ischium", "pubis", "acetabulum"])) {
    return {
      system: "Sistem osos",
      segment: "Membru inferior",
      group: "Centura pelvina",
      subgroup: "Os coxal si bazin osos",
      functionHint: "Leaga membrul inferior de trunchi si preia greutatea corpului.",
    };
  }

  if (hasAny(name, ["clavicle", "scapula"])) {
    return {
      system: "Sistem osos",
      segment: "Membru superior",
      group: "Centura scapulara",
      subgroup: "Clavicula si scapula",
      functionHint: "Leaga membrul superior de torace.",
    };
  }

  if (hasAny(name, ["humerus"])) {
    return {
      system: "Sistem osos",
      segment: "Membru superior",
      group: "Scheletul bratului",
      subgroup: "Humerus",
      functionHint: "Actioneaza ca parghie pentru miscarile membrului superior.",
    };
  }

  if (hasAny(name, ["radius", "ulna"])) {
    return {
      system: "Sistem osos",
      segment: "Membru superior",
      group: "Scheletul antebratului",
      subgroup: "Radius si ulna",
      functionHint: "Sustine miscarile antebratului si mainii.",
    };
  }

  if (hasAny(name, ["carpal", "metacarpal", "phalanx of hand"])) {
    return {
      system: "Sistem osos",
      segment: "Membru superior",
      group: "Scheletul mainii",
      subgroup: "Carpiene, metacarpiene si falange",
      functionHint: "Asigura suportul pentru miscarile fine ale mainii.",
    };
  }

  if (hasAny(name, ["femur", "patella"])) {
    return {
      system: "Sistem osos",
      segment: "Membru inferior",
      group: "Scheletul coapsei",
      subgroup: hasAny(name, ["patella"]) ? "Rotula" : "Femur",
      functionHint: "Preia greutatea corpului si participa la locomotie.",
    };
  }

  if (hasAny(name, ["tibia", "fibula"])) {
    return {
      system: "Sistem osos",
      segment: "Membru inferior",
      group: "Scheletul gambei",
      subgroup: "Tibia si fibula",
      functionHint: "Sustine greutatea si miscarile gambei.",
    };
  }

  if (hasAny(name, ["tarsal", "metatarsal", "phalanx of foot", "calcaneus", "talus", "cuboid", "cuneiform", "navicular"])) {
    return {
      system: "Sistem osos",
      segment: "Membru inferior",
      group: "Scheletul piciorului",
      subgroup: "Tarsiene, metatarsiene si falange",
      functionHint: "Sustine statica, mersul si echilibrul.",
    };
  }

  return {
    system: "Sistem osos",
    segment: "Corp",
    group: "Schelet",
    subgroup: "Incadrare generala",
    functionHint: "Oasele formeaza componenta pasiva a aparatului locomotor.",
  };
}

function organInfo(name: string): AnatomyCurriculumInfo {
  if (hasAny(name, ["heart", "cor", "inima"])) {
    return {
      system: "Organe interne",
      segment: "Torace",
      group: "Aparat cardiovascular",
      subgroup: "Inima",
      functionHint: "Pompeaza sangele catre plamani si catre restul corpului.",
    };
  }

  if (hasAny(name, ["lung", "pulmon", "plaman"])) {
    return {
      system: "Organe interne",
      segment: "Torace",
      group: "Aparat respirator",
      subgroup: "Plamani",
      functionHint: "Realizeaza schimbul de oxigen si dioxid de carbon.",
    };
  }

  if (hasAny(name, ["liver", "hepar", "ficat", "stomach", "ventriculus", "stomac", "intestine", "pancreas", "esophagus", "oesophagus", "esofag"])) {
    return {
      system: "Organe interne",
      segment: "Abdomen",
      group: "Aparat digestiv",
      subgroup: "Organe digestive",
      functionHint: "Participa la digestie, absorbtie sau procesarea substantelor nutritive.",
    };
  }

  if (hasAny(name, ["kidney", "renes", "rinichi", "bladder", "vesica", "vezica"])) {
    return {
      system: "Organe interne",
      segment: "Abdomen si pelvis",
      group: "Aparat urinar",
      subgroup: "Organe urinare",
      functionHint: "Participa la filtrarea, stocarea si eliminarea urinei.",
    };
  }

  if (hasAny(name, ["trachea", "trahee"])) {
    return {
      system: "Organe interne",
      segment: "Gat si torace",
      group: "Aparat respirator",
      subgroup: "Cai respiratorii",
      functionHint: "Permite trecerea aerului catre plamani.",
    };
  }

  return {
    system: "Organe interne",
    segment: "Corp",
    group: "Organe interne",
    subgroup: "Incadrare generala",
    functionHint: "Organ intern implicat in functionarea organismului.",
  };
}

export function classifyAnatomyStructure(input: {
  tissue: TissueType;
  label?: string;
  labelEn?: string;
  id?: string;
}): AnatomyCurriculumInfo {
  const name = normalize([input.labelEn, input.label, input.id].filter(Boolean).join(" "));

  if (input.tissue === "os") return withAspect(boneInfo(name), name);
  if (input.tissue === "organ") return withAspect(organInfo(name), name);

  if (input.tissue === "tendon") {
    const muscle = muscleInfo(name);
    return withAspect({
      ...muscle,
      system: "Tendoane si tesut conjunctiv",
      group: muscle.group.replace("Muschii", "Tendoanele/fasciile asociate muschilor"),
      functionHint: "Leaga, stabilizeaza sau transmit forta dintre muschi, oase si articulatii.",
    }, name);
  }

  return withAspect(muscleInfo(name), name);
}

// ─── Translation maps (RO → EN) ───────────────────────────────────────────────

const systemMapEn: Record<string, string> = {
  "Sistem osos": "Skeletal system",
  "Sistem muscular": "Muscular system",
  "Organe interne": "Internal organs",
  "Tendoane si tesut conjunctiv": "Tendons and connective tissue",
};

const segmentMapEn: Record<string, string> = {
  "Cap si gat": "Head and neck",
  "Cap": "Head",
  "Gat": "Neck",
  "Trunchi": "Trunk",
  "Torace": "Thorax",
  "Abdomen": "Abdomen",
  "Abdomen si pelvis": "Abdomen and pelvis",
  "Gat si torace": "Neck and thorax",
  "Membru superior": "Upper limb",
  "Membru inferior": "Lower limb",
  "Corp": "Body",
};

const groupMapEn: Record<string, string> = {
  // Muscle groups
  "Muschii cefei": "Nape muscles",
  "Muschii capului": "Head muscles",
  "Muschii gatului": "Neck muscles",
  "Muschii spatelui si ai cefei": "Back and neck muscles",
  "Muschii anterolaterali ai toracelui": "Anterolateral thoracic muscles",
  "Muschii anterolaterali ai abdomenului": "Anterolateral abdominal muscles",
  "Muschii umarului": "Shoulder muscles",
  "Muschii bratului": "Arm muscles",
  "Muschii antebratului": "Forearm muscles",
  "Muschii mainii": "Hand muscles",
  "Muschii bazinului": "Pelvic muscles",
  "Muschii coapsei": "Thigh muscles",
  "Muschii gambei": "Leg muscles",
  "Muschii piciorului": "Foot muscles",
  "Muschii scheletici": "Skeletal muscles",
  // Bone groups
  "Scheletul capului": "Skull",
  "Coloana vertebrala": "Vertebral column",
  "Scheletul toracelui": "Thoracic skeleton",
  "Centura pelvina": "Pelvic girdle",
  "Centura scapulara": "Shoulder girdle",
  "Scheletul bratului": "Arm skeleton",
  "Scheletul antebratului": "Forearm skeleton",
  "Scheletul mainii": "Hand skeleton",
  "Scheletul coapsei": "Thigh skeleton",
  "Scheletul gambei": "Leg skeleton",
  "Scheletul piciorului": "Foot skeleton",
  "Schelet": "Skeleton",
  // Organ groups
  "Aparat cardiovascular": "Cardiovascular system",
  "Aparat respirator": "Respiratory system",
  "Aparat digestiv": "Digestive system",
  "Aparat urinar": "Urinary system",
};

const subgroupMapEn: Record<string, string> = {
  "Plan posterior": "Posterior plane",
  "Muschii masticatori": "Masticatory muscles",
  "Muschii mimicii": "Facial expression muscles",
  "Regiunea anterolaterala si planurile profunde": "Anterolateral region and deep planes",
  "Plan superficial si planuri profunde": "Superficial and deep planes",
  "Muschii respiratori": "Respiratory muscles",
  "Muschii peretelui toracic": "Thoracic wall muscles",
  "Peretele abdominal": "Abdominal wall",
  "Umar anterior": "Anterior shoulder",
  "Umar posterior": "Posterior shoulder",
  "Umar lateral/superior": "Lateral / superior shoulder",
  "Centura scapulara si articulatia umarului": "Shoulder girdle and joint",
  "Loja posterioara": "Posterior compartment",
  "Loja anterioara": "Anterior compartment",
  "Loja mediala": "Medial compartment",
  "Loja anterolaterala": "Anterolateral compartment",
  "Grup anterior": "Anterior group",
  "Grup posterior/lateral": "Posterior / lateral group",
  "Fata palmara si spatiile interosoase": "Palmar face and interosseous spaces",
  "Fata dorsala si fata plantara": "Dorsal and plantar face",
  "Regiunea soldului": "Hip region",
  "Incadrare generala": "General classification",
  // Skull subgroups
  "Neurocraniu - regiunea posterioara": "Neurocranium – posterior region",
  "Neurocraniu - regiunea anterioara": "Neurocranium – anterior region",
  "Neurocraniu - regiunea superolaterala": "Neurocranium – superolateral region",
  "Neurocraniu - regiunea laterala": "Neurocranium – lateral region",
  "Viscerocraniu": "Viscerocranium",
  "Neurocraniu": "Neurocranium",
  // Vertebral
  "Regiunea cervicala": "Cervical region",
  "Regiunea toracala": "Thoracic region",
  "Regiunea lombara": "Lumbar region",
  "Regiunea sacrala/coccigiana": "Sacral / coccygeal region",
  // Thoracic
  "Coaste": "Ribs",
  "Stern": "Sternum",
  // Pelvic
  "Os coxal si bazin osos": "Hip bone and bony pelvis",
  // Shoulder girdle
  "Clavicula si scapula": "Clavicle and scapula",
  // Upper limb
  "Humerus": "Humerus",
  "Radius si ulna": "Radius and ulna",
  "Carpiene, metacarpiene si falange": "Carpals, metacarpals and phalanges",
  // Lower limb
  "Rotula": "Patella",
  "Femur": "Femur",
  "Tibia si fibula": "Tibia and fibula",
  "Tarsiene, metatarsiene si falange": "Tarsals, metatarsals and phalanges",
  // Organs
  "Inima": "Heart",
  "Plamani": "Lungs",
  "Organe digestive": "Digestive organs",
  "Organe urinare": "Urinary organs",
  "Cai respiratorii": "Airway",
  "Organe interne": "Internal organs",
};

const aspectMapEn: Record<string, string> = {
  "Fata anterioara": "Anterior face",
  "Fata posterioara": "Posterior face",
  "Fata laterala": "Lateral face",
  "Fata mediala": "Medial face",
  "Plan profund": "Deep plane",
  "Plan general": "General plane",
};

const functionHintMapEn: Record<string, string> = {
  "Participa la extensia, rotatia si stabilizarea capului si gatului.":
    "Participates in extension, rotation and stabilisation of the head and neck.",
  "Participa la mimica fetei sau la masticatie.":
    "Participates in facial expressions or mastication.",
  "Ajuta la miscarile capului, gatului si la stabilizarea regiunii cervicale.":
    "Assists with head and neck movements and stabilises the cervical region.",
  "Sustin postura si participa la miscarile trunchiului, capului si centurii scapulare.":
    "Supports posture and participates in movements of the trunk, head and shoulder girdle.",
  "Contribuie la miscarile toracelui, respiratie si stabilizarea umarului.":
    "Contributes to thoracic movements, respiration and shoulder stabilisation.",
  "Sustin peretele abdominal si participa la flexia, rotatia si stabilizarea trunchiului.":
    "Supports the abdominal wall and participates in flexion, rotation and trunk stabilisation.",
  "Mobilizeaza si stabilizeaza umarul.": "Mobilises and stabilises the shoulder.",
  "Realizeaza miscari ale bratului si antebratului, mai ales flexie sau extensie.":
    "Performs arm and forearm movements, especially flexion or extension.",
  "Controleaza miscarile antebratului, mainii si degetelor.":
    "Controls forearm, hand and finger movements.",
  "Permit miscari fine ale degetelor si prizei mainii.":
    "Enables fine finger movements and hand grip.",
  "Stabilizeaza soldul si participa la miscarile coapsei.":
    "Stabilises the hip and participates in thigh movements.",
  "Participa la miscarile coapsei, genunchiului si la locomotie.":
    "Participates in thigh and knee movements and locomotion.",
  "Controleaza miscarile gambei, labei piciorului si degetelor.":
    "Controls movements of the leg, foot and toes.",
  "Sustin bolta plantara si miscarile degetelor piciorului.":
    "Supports the plantar arch and toe movements.",
  "Muschii scheletici sunt componenta activa a miscarii.":
    "Skeletal muscles are the active component of movement.",
  "Protejeaza encefalul si formeaza suportul fetei.":
    "Protects the brain and forms the facial support.",
  "Sustine corpul, protejeaza maduva spinarii si permite miscari ale trunchiului.":
    "Supports the body, protects the spinal cord and allows trunk movements.",
  "Protejeaza inima si plamanii si participa la mecanica respiratiei.":
    "Protects the heart and lungs and participates in the mechanics of respiration.",
  "Leaga membrul inferior de trunchi si preia greutatea corpului.":
    "Connects the lower limb to the trunk and bears body weight.",
  "Leaga membrul superior de torace.": "Connects the upper limb to the thorax.",
  "Actioneaza ca parghie pentru miscarile membrului superior.":
    "Acts as a lever for upper limb movements.",
  "Sustine miscarile antebratului si mainii.": "Supports forearm and hand movements.",
  "Asigura suportul pentru miscarile fine ale mainii.":
    "Provides support for fine hand movements.",
  "Preia greutatea corpului si participa la locomotie.":
    "Bears body weight and participates in locomotion.",
  "Sustine greutatea si miscarile gambei.": "Supports the weight and movements of the leg.",
  "Sustine statica, mersul si echilibrul.": "Supports static posture, walking and balance.",
  "Oasele formeaza componenta pasiva a aparatului locomotor.":
    "Bones form the passive component of the locomotor system.",
  "Pompeaza sangele catre plamani si catre restul corpului.":
    "Pumps blood to the lungs and to the rest of the body.",
  "Realizeaza schimbul de oxigen si dioxid de carbon.":
    "Performs the exchange of oxygen and carbon dioxide.",
  "Participa la digestie, absorbtie sau procesarea substantelor nutritive.":
    "Participates in digestion, absorption or processing of nutrients.",
  "Participa la filtrarea, stocarea si eliminarea urinei.":
    "Participates in filtration, storage and elimination of urine.",
  "Permite trecerea aerului catre plamani.": "Allows air passage to the lungs.",
  "Organ intern implicat in functionarea organismului.":
    "Internal organ involved in the functioning of the organism.",
  "Leaga, stabilizeaza sau transmit forta dintre muschi, oase si articulatii.":
    "Connects, stabilises or transmits force between muscles, bones and joints.",
};

function translateGroup(group: string): string {
  // Tendon groups are built dynamically: "Tendoanele/fasciile asociate muschilor X"
  const tendonPrefix = "Tendoanele/fasciile asociate muschilor ";
  if (group.startsWith(tendonPrefix)) {
    const muscleGroup = "Muschii " + group.slice(tendonPrefix.length);
    const translatedMuscle = groupMapEn[muscleGroup] ?? muscleGroup;
    return `Tendons / fascia of: ${translatedMuscle}`;
  }
  return groupMapEn[group] ?? group;
}

export function translateCurriculumInfo(
  info: AnatomyCurriculumInfo,
  lang: "ro" | "en",
): AnatomyCurriculumInfo {
  if (lang !== "en") return info;
  return {
    system: systemMapEn[info.system] ?? info.system,
    segment: segmentMapEn[info.segment] ?? info.segment,
    group: translateGroup(info.group),
    subgroup: info.subgroup ? (subgroupMapEn[info.subgroup] ?? info.subgroup) : undefined,
    aspect: info.aspect ? (aspectMapEn[info.aspect] ?? info.aspect) : undefined,
    functionHint: functionHintMapEn[info.functionHint] ?? info.functionHint,
  };
}
