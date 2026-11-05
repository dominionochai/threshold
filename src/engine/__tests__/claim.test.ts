import { describe, expect, it } from "vitest";
import { findClaimGaps } from "../claim";

describe("findClaimGaps", () => {
  it("reports each missing meal, attendance, allergy, and ID evidence requirement", () => {
    expect(findClaimGaps()).toEqual([
      { requirement: "mealRecords", description: "Explicit meal records are missing." },
      { requirement: "attendanceDays", description: "Attendance days are missing." },
      { requirement: "allergyDeclarations", description: "Allergy declarations are missing." },
      { requirement: "idDocuments", description: "ID documents are missing." },
    ]);
  });

  it("treats false evidence as a gap while preserving requirements marked true", () => {
    expect(
      findClaimGaps({
        mealRecords: false,
        attendanceDays: true,
        allergyDeclarations: false,
      }),
    ).toEqual([
      { requirement: "mealRecords", description: "Explicit meal records are missing." },
      { requirement: "allergyDeclarations", description: "Allergy declarations are missing." },
      { requirement: "idDocuments", description: "ID documents are missing." },
    ]);
  });

  it("returns no gaps when all four evidence requirements are documented", () => {
    expect(
      findClaimGaps({
        mealRecords: true,
        attendanceDays: true,
        allergyDeclarations: true,
        idDocuments: true,
      }),
    ).toEqual([]);
  });
});
