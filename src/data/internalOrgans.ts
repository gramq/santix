export type OrganDifficulty = "incepator" | "mediu";

export type OrganQuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type OrganVisualPrimitive =
  | {
      kind: "sphere";
      position: [number, number, number];
      scale: [number, number, number];
      rotation?: [number, number, number];
    }
  | {
      kind: "cylinder";
      position: [number, number, number];
      scale: [number, number, number];
      rotation?: [number, number, number];
    }
  | {
      kind: "capsule";
      position: [number, number, number];
      scale: [number, number, number];
      rotation?: [number, number, number];
    }
  | {
      kind: "torus";
      position: [number, number, number];
      scale: [number, number, number];
      rotation?: [number, number, number];
    }
  | {
      kind: "tube";
      points: [number, number, number][];
      radius: number;
      segments?: number;
      closed?: boolean;
    };

export type OrganModelPart = {
  url: string;
  anchor:
    | "thoracic-cavity"
    | "heart-mediastinum"
    | "right-upper-abdomen"
    | "left-upper-abdomen"
    | "retroperitoneal-pair"
    | "retroperitoneal-left"
    | "retroperitoneal-right"
    | "upper-abdomen-center"
    | "spine-reference";
  targetSize: [number, number, number];
  scaleMode?: "uniform" | "fit-box";
  preserveScenePosition?: boolean;
  offset?: [number, number, number];
  rotation?: [number, number, number];
  mirrorX?: boolean;
  nodeNames?: string[];
};

export type OrganInteractionZone = {
  kind: "ellipsoid" | "box";
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
};

export type InternalOrgan = {
  id: string;
  slug: string;
  modelSelectionId: string;
  name: string;
  latinName: string;
  category: string;
  bodyRegion: string;
  difficulty: OrganDifficulty;
  description: string;
  function: string;
  technical: {
    origin: string;
    insertion: string;
    innervation: string;
    action: string;
  };
  quiz: OrganQuizQuestion[];
  color: string;
  emissiveColor: string;
  aiEnabled?: boolean;
  positionStatus?: "valid" | "approximate" | "missing";
  modelParts?: OrganModelPart[];
  interactionZones?: OrganInteractionZone[];
  renderVisualParts?: boolean;
  visualParts: OrganVisualPrimitive[];
};

export const internalOrgans: InternalOrgan[] = [
  {
    id: "organ:inima",
    slug: "organ-inima",
    modelSelectionId: "organ:inima",
    name: "Inimă",
    latinName: "Cor",
    category: "Aparat cardiovascular",
    bodyRegion: "torace",
    difficulty: "incepator",
    description: "Organ muscular situat în torace, între plămâni, cu rol central în circulația sângelui.",
    function: "Pompează sângele către plămâni și către restul corpului.",
    technical: {
      origin: "Situată în mediastin, ușor spre stânga liniei mediane.",
      insertion: "Conectată cu vasele mari: aorta, venele cave, artera pulmonară și venele pulmonare.",
      innervation: "Reglată de sistemul nervos autonom prin fibre simpatice și parasimpatice.",
      action: "Realizează contracții ritmice care mențin circulația sângelui.",
    },
    quiz: [
      {
        question: "Care este rolul principal al inimii?",
        options: ["Filtrează aerul", "Pompează sângele", "Produce bila"],
        correctIndex: 1,
        explanation: "Inima pompează sângele prin vasele de sânge.",
      },
      {
        question: "Unde este localizată inima?",
        options: ["În torace", "În pelvis", "În cavitatea craniană"],
        correctIndex: 0,
        explanation: "Inima se află în torace, între cei doi plămâni.",
      },
    ],
    color: "#b96b73",
    emissiveColor: "#ff7280",
    aiEnabled: true,
    positionStatus: "valid",
    modelParts: [
      {
        url: "/anatomy/hra/VH_M_Heart.glb",
        anchor: "heart-mediastinum",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: [
          "VH_M_heart_right_ventricle",
          "VH_M_heart_left_ventricle",
          "VH_M_papillary_muscle_of_heart_anterior",
        ],
      },
    ],
    interactionZones: [
      { kind: "ellipsoid", position: [0.09, 1.14, 0.55], size: [0.42, 0.48, 0.24] },
    ],
    visualParts: [
      { kind: "sphere", position: [0.04, 0.75, 0.08], scale: [0.09, 0.14, 0.06], rotation: [0.25, 0, -0.3] },
      { kind: "sphere", position: [-0.01, 0.82, 0.08], scale: [0.045, 0.065, 0.04] },
    ],
  },
  {
    id: "organ:plamani",
    slug: "organ-plamani",
    modelSelectionId: "organ:plamani",
    name: "Plămâni",
    latinName: "Pulmones",
    category: "Aparat respirator",
    bodyRegion: "torace",
    difficulty: "incepator",
    description: "Organe pereche din torace, responsabile de schimbul de gaze dintre aer și sânge.",
    function: "Permit oxigenarea sângelui și eliminarea dioxidului de carbon.",
    technical: {
      origin: "Așezați de o parte și de alta a inimii, în cavitatea toracică.",
      insertion: "Comunică cu traheea prin bronhiile principale.",
      innervation: "Reglați de fibre autonome implicate în calibrul bronhiilor și ritmul respirator.",
      action: "Participă la inspirație și expirație prin schimbul de oxigen și dioxid de carbon.",
    },
    quiz: [
      {
        question: "Ce schimb de gaze are loc în plămâni?",
        options: ["Oxigen și dioxid de carbon", "Calciu și fier", "Apă și sare"],
        correctIndex: 0,
        explanation: "Plămânii preiau oxigen și elimină dioxid de carbon.",
      },
      {
        question: "Plămânii fac parte din:",
        options: ["Aparatul respirator", "Aparatul digestiv", "Sistemul osos"],
        correctIndex: 0,
        explanation: "Plămânii sunt organe respiratorii.",
      },
    ],
    color: "#7aa8bd",
    emissiveColor: "#8cd7e8",
    aiEnabled: true,
    positionStatus: "valid",
    modelParts: [
      {
        url: "/anatomy/hra/VH_M_Lung.glb",
        anchor: "thoracic-cavity",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: [
          "VH_M_left_lingula_superior_bronchopulmonary_segment",
          "VH_M_left_anterior_bronchopulmonary_segment",
          "VH_M_right_apical_bronchopulmonary_segment",
          "VH_M_right_anterior_bronchopulmonary_segment",
          "VH_M_trachea",
        ],
      },
    ],
    interactionZones: [
      { kind: "ellipsoid", position: [0.28, 1.12, 0.36], size: [0.52, 1, 0.24] },
      { kind: "ellipsoid", position: [-0.28, 1.1, 0.36], size: [0.52, 1, 0.24] },
    ],
    visualParts: [
      { kind: "sphere", position: [-0.16, 0.99, 0.04], scale: [0.13, 0.24, 0.06], rotation: [0, 0, 0.08] },
      { kind: "sphere", position: [-0.18, 0.74, 0.04], scale: [0.11, 0.2, 0.055], rotation: [0, 0, -0.02] },
      { kind: "sphere", position: [0.16, 0.99, 0.04], scale: [0.13, 0.24, 0.06], rotation: [0, 0, -0.08] },
      { kind: "sphere", position: [0.18, 0.74, 0.04], scale: [0.11, 0.2, 0.055], rotation: [0, 0, 0.02] },
    ],
  },
  {
    id: "organ:ficat",
    slug: "organ-ficat",
    modelSelectionId: "organ:ficat",
    name: "Ficat",
    latinName: "Hepar",
    category: "Aparat digestiv",
    bodyRegion: "abdomen",
    difficulty: "incepator",
    description: "Organ voluminos din partea dreaptă superioară a abdomenului.",
    function: "Procesează nutrienți, produce bilă și participă la detoxifierea organismului.",
    technical: {
      origin: "Localizat sub diafragmă, predominant în partea dreaptă a abdomenului superior.",
      insertion: "Conectat funcțional cu vezica biliară, vasele hepatice și sistemul digestiv.",
      innervation: "Primește fibre autonome prin plexuri nervoase abdominale.",
      action: "Metabolizează substanțe, produce bilă și susține echilibrul metabolic.",
    },
    quiz: [
      {
        question: "Ce produce ficatul pentru digestia grăsimilor?",
        options: ["Bilă", "Insulină", "Aer"],
        correctIndex: 0,
        explanation: "Bila ajută la digestia grăsimilor.",
      },
      {
        question: "Ficatul se află predominant în:",
        options: ["Partea dreaptă superioară a abdomenului", "Antebraț", "Gambă"],
        correctIndex: 0,
        explanation: "Ficatul este situat sub diafragmă, mai ales în dreapta.",
      },
    ],
    color: "#9f7a55",
    emissiveColor: "#d6a05c",
    aiEnabled: true,
    positionStatus: "valid",
    modelParts: [
      {
        url: "/anatomy/hra/VH_M_Liver.glb",
        anchor: "right-upper-abdomen",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: ["VH_M_liver_capsule", "VH_M_caudate_lobe_of_liver", "VH_M_quadrate_lobe_of_liver"],
      },
    ],
    interactionZones: [
      { kind: "ellipsoid", position: [-0.18, 0.76, 0.38], size: [0.58, 0.44, 0.24], rotation: [0.05, 0, 0.05] },
    ],
    visualParts: [
      { kind: "sphere", position: [-0.13, 0.32, 0.07], scale: [0.24, 0.095, 0.055], rotation: [0.05, 0, 0.06] },
      { kind: "sphere", position: [0.08, 0.28, 0.07], scale: [0.095, 0.065, 0.045], rotation: [0.05, 0, -0.08] },
    ],
  },
  {
    id: "organ:stomac",
    slug: "organ-stomac",
    modelSelectionId: "organ:stomac",
    name: "Stomac",
    latinName: "Ventriculus",
    category: "Aparat digestiv",
    bodyRegion: "abdomen",
    difficulty: "incepator",
    description: "Organ cavitar al digestiei, situat în abdomenul superior.",
    function: "Amestecă alimentele cu sucuri gastrice și începe digestia proteinelor.",
    technical: {
      origin: "Localizat în abdomenul superior, mai ales spre partea stângă.",
      insertion: "Primește alimente prin esofag și continuă către duoden.",
      innervation: "Reglat de sistemul nervos autonom, inclusiv prin nervul vag.",
      action: "Depozitează, amestecă și fragmentează alimentele înainte de intestin.",
    },
    quiz: [
      {
        question: "Stomacul primește alimentele prin:",
        options: ["Esofag", "Trahee", "Aortă"],
        correctIndex: 0,
        explanation: "Esofagul transportă alimentele către stomac.",
      },
      {
        question: "Stomacul aparține aparatului:",
        options: ["Digestiv", "Respirator", "Locomotor"],
        correctIndex: 0,
        explanation: "Stomacul este un organ digestiv.",
      },
    ],
    color: "#c89676",
    emissiveColor: "#e8ad82",
    aiEnabled: false,
    positionStatus: "missing",
    visualParts: [
      { kind: "sphere", position: [0.13, 0.17, 0.08], scale: [0.105, 0.14, 0.05], rotation: [0, 0, 0.45] },
    ],
  },
  {
    id: "organ:rinichi",
    slug: "organ-rinichi",
    modelSelectionId: "organ:rinichi",
    name: "Rinichi",
    latinName: "Renes",
    category: "Aparat urinar",
    bodyRegion: "abdomen",
    difficulty: "incepator",
    description: "Organe pereche care filtrează sângele și contribuie la formarea urinei.",
    function: "Elimină produse de metabolism și reglează echilibrul de apă și săruri.",
    technical: {
      origin: "Situați posterior în abdomen, de o parte și de alta a coloanei lombare.",
      insertion: "Se continuă prin uretere către vezica urinară.",
      innervation: "Primesc fibre autonome prin plexurile renale.",
      action: "Filtrează sângele, formează urina și susțin echilibrul intern.",
    },
    quiz: [
      {
        question: "Ce formează rinichii?",
        options: ["Urină", "Bilă", "Aer"],
        correctIndex: 0,
        explanation: "Rinichii filtrează sângele și formează urina.",
      },
      {
        question: "Rinichii sunt organe:",
        options: ["Pereche", "Unice", "Ale sistemului muscular"],
        correctIndex: 0,
        explanation: "Omul are doi rinichi.",
      },
    ],
    color: "#9b6f91",
    emissiveColor: "#d28abd",
    aiEnabled: true,
    positionStatus: "valid",
    modelParts: [
      {
        url: "/anatomy/hra/VH_M_Kidney_R.glb",
        anchor: "retroperitoneal-right",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: ["VH_M_kidney_capsule_R", "VH_M_hilum_of_kidney_R", "VH_M_outer_cortex_of_kidney_R"],
      },
      {
        url: "/anatomy/hra/VH_M_Kidney_L.glb",
        anchor: "retroperitoneal-left",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: ["VH_M_kidney_capsule_L", "VH_M_hilum_of_kidney_L", "VH_M_outer_cortex_of_kidney_L"],
      },
    ],
    interactionZones: [
      { kind: "ellipsoid", position: [-0.34, 0.48, 0.58], size: [0.38, 0.54, 0.28], rotation: [0, 0, -0.12] },
      { kind: "ellipsoid", position: [0.4, 0.5, 0.58], size: [0.38, 0.54, 0.28], rotation: [0, 0, 0.12] },
    ],
    visualParts: [
      { kind: "sphere", position: [-0.19, 0.08, -0.01], scale: [0.055, 0.105, 0.034], rotation: [0, 0, 0.14] },
      { kind: "sphere", position: [0.19, 0.08, -0.01], scale: [0.055, 0.105, 0.034], rotation: [0, 0, -0.14] },
    ],
  },
  {
    id: "organ:intestine",
    slug: "organ-intestine",
    modelSelectionId: "organ:intestine",
    name: "Intestine",
    latinName: "Intestina",
    category: "Aparat digestiv",
    bodyRegion: "abdomen",
    difficulty: "incepator",
    description: "Segmente digestive aflate în abdomen, implicate în absorbția nutrienților și eliminare.",
    function: "Finalizează digestia, absoarbe nutrienți și formează materiile fecale.",
    technical: {
      origin: "Așezate în cavitatea abdominală, sub stomac.",
      insertion: "Se continuă de la duoden către intestinul subțire, colon și rect.",
      innervation: "Controlate de sistemul nervos enteric și fibre autonome.",
      action: "Amestecă, propulsează și absorb componentele utile din alimente.",
    },
    quiz: [
      {
        question: "Ce rol important au intestinele?",
        options: ["Absorb nutrienți", "Pompează sânge", "Mișcă oasele"],
        correctIndex: 0,
        explanation: "Intestinele absorb nutrienți după digestie.",
      },
      {
        question: "Intestinele sunt localizate în principal în:",
        options: ["Abdomen", "Craniu", "Antebraț"],
        correctIndex: 0,
        explanation: "Intestinele ocupă mare parte din cavitatea abdominală.",
      },
    ],
    color: "#b98c72",
    emissiveColor: "#e5a27e",
    aiEnabled: true,
    positionStatus: "valid",
    modelParts: [
      {
        url: "/anatomy/hra/VH_M_Small_Intestine.glb",
        anchor: "upper-abdomen-center",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: ["VH_M_duodenum", "VH_M_jejunum", "VH_M_ileum"],
      },
      {
        url: "/anatomy/hra/SBU_M_Intestine_Large.glb",
        anchor: "upper-abdomen-center",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: [
          "VH_M_ascending_colon",
          "VH_M_descending_colon",
          "VH_M_transverse_colon",
          "VH_M_sigmoid_colon",
        ],
      },
    ],
    interactionZones: [
      { kind: "box", position: [0.04, 0.16, 0.42], size: [0.62, 0.76, 0.2] },
      { kind: "box", position: [0.1, 0.36, 0.36], size: [0.42, 0.34, 0.18] },
    ],
    visualParts: [
      {
        kind: "tube",
        radius: 0.022,
        closed: true,
        segments: 72,
        points: [
          [-0.2, -0.1, 0.09],
          [-0.24, -0.24, 0.09],
          [-0.16, -0.39, 0.1],
          [0, -0.45, 0.1],
          [0.17, -0.39, 0.1],
          [0.23, -0.23, 0.09],
          [0.18, -0.1, 0.09],
          [0, -0.05, 0.09],
        ],
      },
      {
        kind: "tube",
        radius: 0.018,
        segments: 88,
        points: [
          [-0.13, -0.18, 0.12],
          [-0.02, -0.14, 0.12],
          [0.1, -0.19, 0.12],
          [0.02, -0.25, 0.12],
          [-0.11, -0.29, 0.12],
          [-0.02, -0.34, 0.12],
          [0.12, -0.34, 0.12],
          [0.04, -0.4, 0.12],
          [-0.09, -0.39, 0.12],
        ],
      },
    ],
  },
  {
    id: "organ:splina",
    slug: "organ-splina",
    modelSelectionId: "organ:splina",
    name: "Splină",
    latinName: "Lien",
    category: "Aparat limfatic",
    bodyRegion: "abdomen",
    difficulty: "mediu",
    description: "Organ limfoid situat în partea superioară stângă a abdomenului.",
    function: "Filtrează sângele și contribuie la răspunsul imun.",
    technical: {
      origin: "Localizată sub hemidiafragma stângă, lateral de stomac.",
      insertion: "Este conectată vascular prin artera și vena splenică.",
      innervation: "Primește fibre autonome prin plexul celiac.",
      action: "Filtrează celulele sanguine îmbătrânite și susține imunitatea.",
    },
    quiz: [
      {
        question: "Unde este localizată splina?",
        options: ["În abdomenul superior stâng", "În craniu", "În gambă"],
        correctIndex: 0,
        explanation: "Splina se află în partea superioară stângă a abdomenului.",
      },
      {
        question: "Un rol important al splinei este:",
        options: ["Filtrarea sângelui", "Pomparea sângelui", "Schimbul de gaze"],
        correctIndex: 0,
        explanation: "Splina filtrează sângele și participă la apărarea imună.",
      },
    ],
    color: "#8d6ea8",
    emissiveColor: "#ba8edb",
    aiEnabled: false,
    positionStatus: "missing",
    visualParts: [
      {
        kind: "sphere",
        position: [0.22, 0.48, -0.03],
        scale: [0.075, 0.17, 0.055],
        rotation: [0.05, 0.05, -0.22],
      },
    ],
  },
  {
    id: "organ:pancreas",
    slug: "organ-pancreas",
    modelSelectionId: "organ:pancreas",
    name: "Pancreas",
    latinName: "Pancreas",
    category: "Aparat digestiv și endocrin",
    bodyRegion: "abdomen",
    difficulty: "mediu",
    description: "Organ alungit situat posterior de stomac, cu rol digestiv și endocrin.",
    function: "Produce enzime digestive și hormoni implicați în reglarea glicemiei.",
    technical: {
      origin: "Așezat transversal în abdomenul superior, în spatele stomacului.",
      insertion: "Conectat funcțional cu duodenul prin secrețiile pancreatice.",
      innervation: "Reglat de fibre autonome abdominale.",
      action: "Secretă enzime digestive și hormoni precum insulina și glucagonul.",
    },
    quiz: [
      {
        question: "Pancreasul produce:",
        options: ["Enzime digestive și hormoni", "Oase", "Aer"],
        correctIndex: 0,
        explanation: "Pancreasul are rol digestiv și endocrin.",
      },
      {
        question: "Pancreasul este situat în principal:",
        options: ["În abdomenul superior", "În cavitatea craniană", "În gambă"],
        correctIndex: 0,
        explanation: "Pancreasul se află posterior de stomac.",
      },
    ],
    color: "#c8a86f",
    emissiveColor: "#e4bf7c",
    aiEnabled: true,
    positionStatus: "valid",
    modelParts: [
      {
        url: "/anatomy/hra/VH_M_Pancreas.glb",
        anchor: "upper-abdomen-center",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: [
          "VH_M_body_of_pancreas",
          "VH_M_tail_of_pancreas",
          "VH_M_head_of_pancreas",
          "VH_M_neck_of_pancreas",
        ],
      },
    ],
    interactionZones: [
      { kind: "ellipsoid", position: [0.08, 0.72, 0.48], size: [0.44, 0.24, 0.18], rotation: [0, 0, -0.08] },
    ],
    visualParts: [
      { kind: "capsule", position: [0.02, 0.1, 0.1], scale: [0.014, 0.16, 0.014], rotation: [0, 0, Math.PI / 2] },
    ],
  },
  {
    id: "organ:vezica-urinara",
    slug: "organ-vezica-urinara",
    modelSelectionId: "organ:vezica-urinara",
    name: "Vezică urinară",
    latinName: "Vesica urinaria",
    category: "Aparat urinar",
    bodyRegion: "pelvis",
    difficulty: "incepator",
    description: "Organ cavitar din pelvis care depozitează urina.",
    function: "Stochează urina înainte de eliminare.",
    technical: {
      origin: "Situată în pelvis, sub abdomenul inferior.",
      insertion: "Primește urina prin uretere și se continuă cu uretra.",
      innervation: "Controlată de fibre autonome și somatice implicate în micțiune.",
      action: "Se umple, stochează urina și se contractă pentru eliminare.",
    },
    quiz: [
      {
        question: "Ce depozitează vezica urinară?",
        options: ["Urină", "Bilă", "Oxigen"],
        correctIndex: 0,
        explanation: "Vezica urinară stochează urina.",
      },
      {
        question: "Vezica urinară aparține aparatului:",
        options: ["Urinar", "Respirator", "Cardiovascular"],
        correctIndex: 0,
        explanation: "Vezica este parte a aparatului urinar.",
      },
    ],
    color: "#789fc0",
    emissiveColor: "#8ebfe6",
    aiEnabled: true,
    positionStatus: "valid",
    modelParts: [
      {
        url: "/anatomy/hra/VH_M_Urinary_Bladder.glb",
        anchor: "upper-abdomen-center",
        targetSize: [1, 1, 1],
        preserveScenePosition: true,
        nodeNames: [
          "VH_M_fundus_of_urinary_bladder_dome",
          "VH_M_fundus_of_urinary_bladder_base1",
          "VH_M_trigone_of_urinary_bladder",
        ],
      },
    ],
    interactionZones: [
      { kind: "ellipsoid", position: [-0.02, -0.34, 0.5], size: [0.24, 0.22, 0.18] },
    ],
    visualParts: [
      { kind: "sphere", position: [0, -0.57, 0.08], scale: [0.055, 0.065, 0.04] },
    ],
  },
  {
    id: "organ:esofag",
    slug: "organ-esofag",
    modelSelectionId: "organ:esofag",
    name: "Esofag",
    latinName: "Oesophagus",
    category: "Aparat digestiv",
    bodyRegion: "gat_torace",
    difficulty: "incepator",
    description: "Tub muscular care transportă alimentele din faringe către stomac.",
    function: "Conduce bolul alimentar către stomac prin mișcări peristaltice.",
    technical: {
      origin: "Pornește din zona faringelui și coboară prin gât și torace.",
      insertion: "Se deschide în stomac.",
      innervation: "Reglat de nervi autonomi și fibre asociate nervului vag.",
      action: "Transportă alimentele către stomac.",
    },
    quiz: [
      {
        question: "Esofagul transportă alimentele către:",
        options: ["Stomac", "Plămâni", "Rinichi"],
        correctIndex: 0,
        explanation: "Esofagul face legătura dintre faringe și stomac.",
      },
      {
        question: "Esofagul este parte din aparatul:",
        options: ["Digestiv", "Urinar", "Locomotor"],
        correctIndex: 0,
        explanation: "Esofagul aparține aparatului digestiv.",
      },
    ],
    color: "#8fb5b8",
    emissiveColor: "#9bd5d9",
    aiEnabled: false,
    positionStatus: "missing",
    visualParts: [
      {
        kind: "tube",
        radius: 0.011,
        segments: 24,
        points: [
          [0, 1.28, 0.08],
          [0, 0.94, 0.08],
          [0.02, 0.62, 0.08],
          [0.12, 0.21, 0.08],
        ],
      },
    ],
  },
  {
    id: "organ:trahee",
    slug: "organ-trahee",
    modelSelectionId: "organ:trahee",
    name: "Trahee",
    latinName: "Trachea",
    category: "Aparat respirator",
    bodyRegion: "gat_torace",
    difficulty: "incepator",
    description: "Conduct respirator care face legătura dintre laringe și bronhii.",
    function: "Permite trecerea aerului către plămâni.",
    technical: {
      origin: "Pornește sub laringe, în regiunea gâtului.",
      insertion: "Se bifurcă în bronhiile principale care intră în plămâni.",
      innervation: "Reglată de fibre autonome și reflexe respiratorii.",
      action: "Menține o cale deschisă pentru trecerea aerului.",
    },
    quiz: [
      {
        question: "Traheea transportă:",
        options: ["Aer", "Urină", "Bilă"],
        correctIndex: 0,
        explanation: "Traheea conduce aerul către bronhii și plămâni.",
      },
      {
        question: "Traheea face parte din aparatul:",
        options: ["Respirator", "Digestiv", "Urinar"],
        correctIndex: 0,
        explanation: "Traheea este un conduct respirator.",
      },
    ],
    color: "#8fb5b8",
    emissiveColor: "#9bd5d9",
    aiEnabled: false,
    positionStatus: "missing",
    visualParts: [
      {
        kind: "tube",
        radius: 0.018,
        segments: 20,
        points: [
          [0, 1.44, 0.08],
          [0, 1.2, 0.08],
          [0, 1.02, 0.08],
        ],
      },
      {
        kind: "tube",
        radius: 0.011,
        segments: 14,
        points: [
          [0, 1.02, 0.08],
          [-0.08, 0.88, 0.08],
          [-0.14, 0.76, 0.08],
        ],
      },
      {
        kind: "tube",
        radius: 0.011,
        segments: 14,
        points: [
          [0, 1.02, 0.08],
          [0.08, 0.88, 0.08],
          [0.14, 0.76, 0.08],
        ],
      },
    ],
  },
];

export function getInternalOrgan(id: string | null | undefined) {
  if (!id) return undefined;
  return internalOrgans.find(
    (organ) => organ.id === id || organ.slug === id || organ.modelSelectionId === id,
  );
}
