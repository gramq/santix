import type { InternalOrgan } from "./internalOrgans";

type SupportedLanguage = "ro" | "en";

type LocalizedOrganText = Pick<
  InternalOrgan,
  "name" | "category" | "bodyRegion" | "description" | "function" | "technical" | "quiz"
>;

const organEnglishText: Record<string, LocalizedOrganText> = {
  "organ:inima": {
    name: "Heart",
    category: "Cardiovascular system",
    bodyRegion: "chest",
    description:
      "A muscular organ located in the chest, between the lungs, with a central role in blood circulation.",
    function: "Pumps blood to the lungs and to the rest of the body.",
    technical: {
      origin: "Located in the mediastinum, slightly left of the midline.",
      insertion: "Connected to the great vessels: aorta, venae cavae, pulmonary artery and pulmonary veins.",
      innervation: "Regulated by the autonomic nervous system through sympathetic and parasympathetic fibers.",
      action: "Produces rhythmic contractions that maintain blood circulation.",
    },
    quiz: [
      {
        question: "What is the heart's main role?",
        options: ["Filtering air", "Pumping blood", "Producing bile"],
        correctIndex: 1,
        explanation: "The heart pumps blood through the blood vessels.",
      },
      {
        question: "Where is the heart located?",
        options: ["In the chest", "In the pelvis", "In the cranial cavity"],
        correctIndex: 0,
        explanation: "The heart is located in the chest, between the lungs.",
      },
    ],
  },
  "organ:plamani": {
    name: "Lungs",
    category: "Respiratory system",
    bodyRegion: "chest",
    description: "Paired organs in the chest responsible for gas exchange between air and blood.",
    function: "Allow blood oxygenation and carbon dioxide elimination.",
    technical: {
      origin: "Placed on both sides of the heart inside the thoracic cavity.",
      insertion: "Communicate with the trachea through the main bronchi.",
      innervation: "Regulated by autonomic fibers involved in bronchial diameter and breathing rhythm.",
      action: "Support inspiration and expiration through oxygen and carbon dioxide exchange.",
    },
    quiz: [
      {
        question: "Which gas exchange happens in the lungs?",
        options: ["Oxygen and carbon dioxide", "Calcium and iron", "Water and salt"],
        correctIndex: 0,
        explanation: "The lungs take in oxygen and remove carbon dioxide.",
      },
      {
        question: "The lungs are part of the:",
        options: ["Respiratory system", "Digestive system", "Skeletal system"],
        correctIndex: 0,
        explanation: "The lungs are respiratory organs.",
      },
    ],
  },
  "organ:ficat": {
    name: "Liver",
    category: "Digestive system",
    bodyRegion: "abdomen",
    description: "A large organ in the upper right abdomen.",
    function: "Processes nutrients, produces bile and contributes to detoxification.",
    technical: {
      origin: "Located under the diaphragm, mainly in the upper right abdomen.",
      insertion: "Functionally connected with the gallbladder, hepatic vessels and digestive system.",
      innervation: "Receives autonomic fibers through abdominal nerve plexuses.",
      action: "Metabolizes substances, produces bile and supports metabolic balance.",
    },
    quiz: [
      {
        question: "What does the liver produce to help digest fats?",
        options: ["Bile", "Insulin", "Air"],
        correctIndex: 0,
        explanation: "Bile helps digest fats.",
      },
      {
        question: "The liver is mainly located in the:",
        options: ["Upper right abdomen", "Forearm", "Calf"],
        correctIndex: 0,
        explanation: "The liver sits under the diaphragm, mostly on the right side.",
      },
    ],
  },
  "organ:stomac": {
    name: "Stomach",
    category: "Digestive system",
    bodyRegion: "abdomen",
    description: "A hollow digestive organ located in the upper abdomen.",
    function: "Mixes food with gastric juices and begins protein digestion.",
    technical: {
      origin: "Located in the upper abdomen, mostly toward the left side.",
      insertion: "Receives food through the esophagus and continues into the duodenum.",
      innervation: "Regulated by the autonomic nervous system, including the vagus nerve.",
      action: "Stores, mixes and breaks down food before it reaches the intestine.",
    },
    quiz: [
      {
        question: "Food reaches the stomach through the:",
        options: ["Esophagus", "Trachea", "Aorta"],
        correctIndex: 0,
        explanation: "The esophagus carries food to the stomach.",
      },
      {
        question: "The stomach belongs to the:",
        options: ["Digestive system", "Respiratory system", "Locomotor system"],
        correctIndex: 0,
        explanation: "The stomach is a digestive organ.",
      },
    ],
  },
  "organ:rinichi": {
    name: "Kidneys",
    category: "Urinary system",
    bodyRegion: "abdomen",
    description: "Paired organs that filter blood and help form urine.",
    function: "Remove metabolic waste and regulate water and salt balance.",
    technical: {
      origin: "Located posteriorly in the abdomen, on both sides of the lumbar spine.",
      insertion: "Continue through the ureters toward the urinary bladder.",
      innervation: "Receive autonomic fibers through the renal plexuses.",
      action: "Filter blood, form urine and support internal balance.",
    },
    quiz: [
      {
        question: "What do the kidneys form?",
        options: ["Urine", "Bile", "Air"],
        correctIndex: 0,
        explanation: "The kidneys filter blood and form urine.",
      },
      {
        question: "The kidneys are:",
        options: ["Paired organs", "Single organs", "Part of the muscular system"],
        correctIndex: 0,
        explanation: "Humans normally have two kidneys.",
      },
    ],
  },
  "organ:intestine": {
    name: "Intestines",
    category: "Digestive system",
    bodyRegion: "abdomen",
    description: "Digestive segments in the abdomen involved in nutrient absorption and elimination.",
    function: "Complete digestion, absorb nutrients and form fecal matter.",
    technical: {
      origin: "Located in the abdominal cavity, below the stomach.",
      insertion: "Continue from the duodenum into the small intestine, colon and rectum.",
      innervation: "Controlled by the enteric nervous system and autonomic fibers.",
      action: "Mix, move and absorb useful components from food.",
    },
    quiz: [
      {
        question: "What important role do the intestines have?",
        options: ["Absorbing nutrients", "Pumping blood", "Moving bones"],
        correctIndex: 0,
        explanation: "The intestines absorb nutrients after digestion.",
      },
      {
        question: "The intestines are mainly located in the:",
        options: ["Abdomen", "Skull", "Forearm"],
        correctIndex: 0,
        explanation: "The intestines occupy much of the abdominal cavity.",
      },
    ],
  },
  "organ:splina": {
    name: "Spleen",
    category: "Lymphatic system",
    bodyRegion: "abdomen",
    description: "A lymphoid organ located in the upper left abdomen.",
    function: "Filters blood and contributes to immune response.",
    technical: {
      origin: "Located under the left hemidiaphragm, lateral to the stomach.",
      insertion: "Vascularly connected through the splenic artery and vein.",
      innervation: "Receives autonomic fibers through the celiac plexus.",
      action: "Filters aged blood cells and supports immunity.",
    },
    quiz: [
      {
        question: "Where is the spleen located?",
        options: ["Upper left abdomen", "Skull", "Calf"],
        correctIndex: 0,
        explanation: "The spleen is in the upper left abdomen.",
      },
      {
        question: "An important role of the spleen is:",
        options: ["Filtering blood", "Pumping blood", "Gas exchange"],
        correctIndex: 0,
        explanation: "The spleen filters blood and supports immune defense.",
      },
    ],
  },
  "organ:pancreas": {
    name: "Pancreas",
    category: "Digestive and endocrine system",
    bodyRegion: "abdomen",
    description: "An elongated organ behind the stomach with digestive and endocrine roles.",
    function: "Produces digestive enzymes and hormones involved in blood sugar regulation.",
    technical: {
      origin: "Placed transversely in the upper abdomen, behind the stomach.",
      insertion: "Functionally connected to the duodenum through pancreatic secretions.",
      innervation: "Regulated by abdominal autonomic fibers.",
      action: "Secretes digestive enzymes and hormones such as insulin and glucagon.",
    },
    quiz: [
      {
        question: "The pancreas produces:",
        options: ["Digestive enzymes and hormones", "Bones", "Air"],
        correctIndex: 0,
        explanation: "The pancreas has both digestive and endocrine roles.",
      },
      {
        question: "The pancreas is mainly located:",
        options: ["In the upper abdomen", "In the cranial cavity", "In the calf"],
        correctIndex: 0,
        explanation: "The pancreas is located behind the stomach.",
      },
    ],
  },
  "organ:vezica-urinara": {
    name: "Urinary bladder",
    category: "Urinary system",
    bodyRegion: "pelvis",
    description: "A hollow pelvic organ that stores urine.",
    function: "Stores urine before elimination.",
    technical: {
      origin: "Located in the pelvis, below the lower abdomen.",
      insertion: "Receives urine through the ureters and continues into the urethra.",
      innervation: "Controlled by autonomic and somatic fibers involved in urination.",
      action: "Fills, stores urine and contracts for elimination.",
    },
    quiz: [
      {
        question: "What does the urinary bladder store?",
        options: ["Urine", "Bile", "Oxygen"],
        correctIndex: 0,
        explanation: "The urinary bladder stores urine.",
      },
      {
        question: "The urinary bladder belongs to the:",
        options: ["Urinary system", "Respiratory system", "Cardiovascular system"],
        correctIndex: 0,
        explanation: "The bladder is part of the urinary system.",
      },
    ],
  },
  "organ:esofag": {
    name: "Esophagus",
    category: "Digestive system",
    bodyRegion: "neck and chest",
    description: "A muscular tube that carries food from the pharynx to the stomach.",
    function: "Moves the food bolus toward the stomach through peristaltic movements.",
    technical: {
      origin: "Starts in the pharyngeal area and descends through the neck and chest.",
      insertion: "Opens into the stomach.",
      innervation: "Regulated by autonomic nerves and fibers associated with the vagus nerve.",
      action: "Transports food toward the stomach.",
    },
    quiz: [
      {
        question: "The esophagus carries food toward the:",
        options: ["Stomach", "Lungs", "Kidneys"],
        correctIndex: 0,
        explanation: "The esophagus connects the pharynx to the stomach.",
      },
      {
        question: "The esophagus is part of the:",
        options: ["Digestive system", "Urinary system", "Locomotor system"],
        correctIndex: 0,
        explanation: "The esophagus belongs to the digestive system.",
      },
    ],
  },
  "organ:trahee": {
    name: "Trachea",
    category: "Respiratory system",
    bodyRegion: "neck and chest",
    description: "A respiratory airway connecting the larynx to the bronchi.",
    function: "Allows air to pass toward the lungs.",
    technical: {
      origin: "Starts below the larynx in the neck region.",
      insertion: "Splits into the main bronchi that enter the lungs.",
      innervation: "Regulated by autonomic fibers and respiratory reflexes.",
      action: "Maintains an open airway for air passage.",
    },
    quiz: [
      {
        question: "The trachea carries:",
        options: ["Air", "Urine", "Bile"],
        correctIndex: 0,
        explanation: "The trachea conducts air toward the bronchi and lungs.",
      },
      {
        question: "The trachea is part of the:",
        options: ["Respiratory system", "Digestive system", "Urinary system"],
        correctIndex: 0,
        explanation: "The trachea is a respiratory airway.",
      },
    ],
  },
};

export function localizeInternalOrgan(
  organ: InternalOrgan | undefined,
  lang: SupportedLanguage,
): InternalOrgan | undefined {
  if (!organ || lang === "ro") return organ;
  const localized = organEnglishText[organ.id];
  if (!localized) return organ;

  return {
    ...organ,
    ...localized,
    technical: {
      ...organ.technical,
      ...localized.technical,
    },
    quiz: localized.quiz,
  };
}
