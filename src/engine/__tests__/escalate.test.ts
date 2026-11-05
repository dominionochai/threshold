import { describe, expect, it } from "vitest";
import { orderSteps } from "../escalate";

describe("orderSteps", () => {
  it("orders medical, bed, food, then legal needs with their reasons", () => {
    expect(orderSteps(["legal", "food", "bed", "medical"])).toEqual([
      {
        need: "medical",
        priority: 1,
        reason: "Prioritize medical needs because delayed care can create immediate health risks.",
      },
      {
        need: "bed",
        priority: 2,
        reason: "Prioritize safe shelter next to reduce immediate exposure and instability.",
      },
      {
        need: "food",
        priority: 3,
        reason: "Address food needs after urgent health and shelter needs.",
      },
      {
        need: "legal",
        priority: 4,
        reason: "Address legal needs after immediate health, shelter, and food needs.",
      },
    ]);
  });

  it("returns no plan steps for an empty needs list", () => {
    expect(orderSteps([])).toEqual([]);
  });

  it("preserves input order for needs with equal priority", () => {
    expect(orderSteps(["food", "food"]).map(({ need }) => need)).toEqual(["food", "food"]);
  });
});
