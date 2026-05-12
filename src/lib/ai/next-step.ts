import type { ConversationClassification, ConversationState, NextStep } from "./types";

export type NextStepDecision = {
  nextStep: NextStep;
  lastQuestionIntent: string | null;
  reply: string;
};

export function resolveNextStep(
  state: ConversationState,
  classification: ConversationClassification,
): NextStepDecision {
  if (classification === "out_of_scope") {
    return {
      nextStep: "refuse_out_of_scope",
      lastQuestionIntent: null,
      reply: "Te pot ajuta cu anatomie, durere sau mișcare în context educațional Santix.",
    };
  }

  if (state.red_flags_detected || classification === "red_flag") {
    return {
      nextStep: "urgent",
      lastQuestionIntent: null,
      reply:
        "Descrierea include semne care pot necesita evaluare medicală rapidă. Dacă durerea este severă, există deformare, amorțeală sau nu poți mișca zona, mergi la medic sau la urgențe.",
    };
  }

  if (state.trauma_or_effort === "unknown") {
    return {
      nextStep: "ask_trauma_or_effort",
      lastQuestionIntent: "trauma_or_effort",
      reply: "A apărut după o lovitură, căzătură, sport sau efort?",
    };
  }

  if (state.onset === "unknown") {
    return {
      nextStep: "ask_onset",
      lastQuestionIntent: "onset",
      reply: "A început brusc sau treptat?",
    };
  }

  if (state.movement_ok === "unknown") {
    return {
      nextStep: "ask_movement",
      lastQuestionIntent: "movement_ok",
      reply: "Poți mișca zona normal?",
    };
  }

  if (state.severity === "unknown") {
    return {
      nextStep: "ask_severity",
      lastQuestionIntent: "severity",
      reply: "Durerea este ușoară, moderată sau foarte puternică?",
    };
  }

  if (state.pain_quality === "unknown") {
    return {
      nextStep: "ask_pain_quality",
      lastQuestionIntent: "pain_quality",
      reply: "Cum ai descrie durerea: înțepătoare, arsură, presiune, crampă sau altfel?",
    };
  }

  if (state.swelling === "unknown" || state.numbness === "unknown" || state.bruising === "unknown") {
    return {
      nextStep: "ask_associated_signs",
      lastQuestionIntent: "associated_signs",
      reply: "Ai observat umflătură, amorțeală sau vânătaie?",
    };
  }

  if (state.duration === "unknown") {
    return {
      nextStep: "ask_duration",
      lastQuestionIntent: "duration",
      reply: "De cât timp simți durerea?",
    };
  }

  return {
    nextStep: "recommend",
    lastQuestionIntent: null,
    reply:
      "Din ce ai descris, pare potrivit să urmărești evoluția, să eviți efortul care declanșează durerea și să ceri sfatul unui specialist dacă simptomele se agravează sau persistă.",
  };
}
