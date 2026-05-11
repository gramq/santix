import { expect, test } from "@playwright/test";
import {
  buildClarifyingAnswer,
  classifyQuestion,
  evaluateSelectedContextFit,
  inferSymptomState,
} from "../src/lib/ai-chat.functions";

const baseInput = {
  accessToken: "test-access-token-1234567890",
  tissue: "os",
  structureName: "Humerus",
  structureSlug: "humerus",
  modelSelectionId: "humerus",
  bodyRegion: "brat",
  visualLayer: "skeleton",
  aiLayer: "skeleton",
};

function input(question: string) {
  return { ...baseInput, question } as Parameters<typeof inferSymptomState>[0];
}

function assistant(content_ro: string) {
  return { role: "assistant" as const, content_ro };
}

function user(content_ro: string) {
  return { role: "user" as const, content_ro };
}

test("movement answer does not repeat movement question", () => {
  const state = inferSymptomState(input("pot mișca zona normal"), [
    assistant("Poți mișca zona normal?"),
  ]);
  const answer = buildClarifyingAnswer(input("pot mișca zona normal"), state);

  expect(state.movement_ok).toBe("yes");
  expect(state.answered_fields).toContain("movement_ok");
  expect(answer).not.toContain("Poți mișca zona normal?");
});

test("movement plus severe pain updates both fields", () => {
  const state = inferSymptomState(input("da dar mă doare foarte rău"), [
    user("mă doare"),
    assistant("A apărut după o lovitură, căzătură sau efort?"),
    user("nu"),
    assistant("A început brusc sau treptat?"),
    user("brusc"),
    assistant("Poți mișca zona normal?"),
  ]);
  const answer = buildClarifyingAnswer(input("da dar mă doare foarte rău"), state);

  expect(state.movement_ok).toBe("yes");
  expect(state.severity).toBe("severe");
  expect(answer).not.toContain("Poți mișca zona normal?");
  expect(answer).toContain("umflătură");
});

test("negative associated signs are not red flags", () => {
  const state = inferSymptomState(input("nu"), [
    user("mă doare"),
    assistant("A apărut după o lovitură, căzătură sau efort?"),
    user("nu"),
    assistant("A început brusc sau treptat?"),
    user("brusc"),
    assistant("Poți mișca zona normal?"),
    user("pot mișca normal"),
    assistant("Durerea este ușoară, moderată sau foarte puternică?"),
    user("ușoară"),
    assistant("Ai observat umflătură, amorțeală sau vânătaie?"),
  ]);

  expect(state.swelling).toBe("no");
  expect(state.numbness).toBe("no");
  expect(state.bruising).toBe("no");
  expect(state.red_flags_detected).toBe(false);
});

test("negative trauma answer advances to onset", () => {
  const state = inferSymptomState(input("după niciuna din ele"), [
    user("mă doare"),
    assistant("A apărut după o lovitură, căzătură sau efort?"),
  ]);
  const answer = buildClarifyingAnswer(input("după niciuna din ele"), state);

  expect(state.trauma_or_effort).toBe("no");
  expect(state.trauma_type).toBe("none");
  expect(answer).toContain("A început brusc sau treptat?");
});

test("colloquial structure clarification ignores address terms", () => {
  const state = inferSymptomState(input("la humerus unchiule"), [
    assistant("Te referi la Humerus sau la o durere în zona Membru superior?"),
  ]);

  expect(state.last_question_intent).toBe("structure_or_pain_clarification");
});

test("different body region triggers context switch target", () => {
  const bicepsInput = {
    ...baseInput,
    tissue: "muschi",
    structureName: "Biceps brahial",
    structureSlug: "muschi:biceps-brahial",
    modelSelectionId: "muschi:biceps-brahial",
    bodyRegion: "brat",
    visualLayer: "muscular",
    aiLayer: "muscular",
    question: "mă doare genunchiul când alerg",
  } as Parameters<typeof inferSymptomState>[0];
  const route = classifyQuestion(bicepsInput);
  const state = inferSymptomState(bicepsInput, []);
  const contextSwitch = evaluateSelectedContextFit(bicepsInput, route, state);

  expect(route.category).toBe("symptom_or_injury");
  expect(contextSwitch.selected_context_fit).toBe("different_body_region_detected");
  expect(contextSwitch.target_body_region).toBe("genunchi");
  expect(contextSwitch.target_structure_slug).not.toContain("biceps");
});

test("out of scope investment request is refused by classification", () => {
  const route = classifyQuestion(input("fă-mi un plan de investiții"));

  expect(route.category).toBe("out_of_scope");
});

test("duration reply after duration question reaches a recommendation", () => {
  const state = inferSymptomState(input("o zi"), [
    user("mă doare"),
    assistant("A apărut după o lovitură, căzătură sau efort?"),
    user("nu"),
    assistant("A început brusc sau treptat?"),
    user("brusc"),
    assistant("Poți mișca zona normal?"),
    user("pot mișca normal"),
    assistant("Durerea este ușoară, moderată sau foarte puternică?"),
    user("ușoară"),
    assistant("Ai observat umflătură, amorțeală sau vânătaie?"),
    user("nu"),
    assistant("De cât timp simți durerea?"),
  ]);
  const answer = buildClarifyingAnswer(input("o zi"), state);

  expect(state.duration).toBe("days");
  expect(state.answered_fields).toContain("duration");
  expect(state.next_step).toBe("recommend");
  expect(answer).toContain("faptul că poți mișca zona");
  expect(answer).not.toContain("Nu am înțeles");
});
