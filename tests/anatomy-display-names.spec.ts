import { expect, test } from "@playwright/test";
import { getAnatomyDisplayName, type AnatomyNameRecord } from "../src/data/anatomyDisplayNames";
import type { BoneSelection } from "../src/components/skeleton/SkeletonScene";

function selection(overrides: Partial<BoneSelection>): BoneSelection {
  return {
    id: "test-selection",
    side: "male",
    tissue: "os",
    ...overrides,
  };
}

function display(dbStructure: AnatomyNameRecord, selected: BoneSelection) {
  return getAnatomyDisplayName({ dbStructure, selection: selected });
}

test("uses DB display_name_ro for middle phalanx of fourth finger", () => {
  const result = display(
    {
      display_name_ro: "Falanga mijlocie a degetului inelar",
      subtitle_name: "Middle phalanx of fourth finger",
      english_name: "Middle phalanx of fourth finger",
    },
    selection({
      id: "os-middle-phalanx-of-fourth-finger",
      labelEn: "Middle phalanx of fourth finger",
    }),
  );

  expect(result.title).toBe("Falanga mijlocie a degetului inelar");
  expect(result.subtitle).toBe("Middle phalanx of fourth finger");
  expect(result.title).not.toContain(" al ");
  expect(result.source).toBe("db");
});

test("uses DB common and scientific names for forearm flexors", () => {
  const result = display(
    {
      common_name_ro: "Mușchii flexori ai antebrațului",
      scientific_name_ro: "Flexorii antebrațului",
      english_name: "Forearm flexors",
    },
    selection({
      id: "muschi-forearm-flexors",
      tissue: "muschi",
      labelEn: "Forearm flexors",
    }),
  );

  expect(result.title).toBe("Mușchii flexori ai antebrațului");
  expect(result.subtitle).toBe("Flexorii antebrațului");
});

test("uses DB display and subtitle for humerus", () => {
  const result = display(
    {
      display_name_ro: "Osul brațului",
      subtitle_name: "Humerus",
      english_name: "Humerus",
    },
    selection({ id: "humerus", labelEn: "Humerus" }),
  );

  expect(result.title).toBe("Osul brațului");
  expect(result.subtitle).toBe("Humerus");
});

test("uses DB display and subtitle for brachioradialis", () => {
  const result = display(
    {
      display_name_ro: "Mușchiul lateral al antebrațului",
      subtitle_name: "Brahioradial",
      english_name: "Brachioradialis",
    },
    selection({
      id: "muschi-brachioradialis",
      tissue: "muschi",
      labelEn: "Brachioradialis",
    }),
  );

  expect(result.title).toBe("Mușchiul lateral al antebrațului");
  expect(result.subtitle).toBe("Brahioradial");
});

test("fallback avoids mixed Romanian-English phalanx title while DB migration is pending", () => {
  const result = getAnatomyDisplayName({
    selection: selection({
      id: "os-middle-phalanx-of-fourth-finger",
      label: "Middle phalanx of fourth finger",
      labelEn: "Middle phalanx of fourth finger",
    }),
  });

  expect(result.title).toBe("Falanga mijlocie a degetului inelar");
  expect(result.source).toBe("fallback");
});
