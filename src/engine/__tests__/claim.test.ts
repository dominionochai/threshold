import { describe, expect, it } from "vitest";
import { findClaimGaps } from "../claim";

describe("findClaimGaps", () => {
  it("reports each missing SNAP evidence requirement", () => {
    expect(findClaimGaps()).toEqual([
      { requirement: "householdMembersId", description: "ID for all household members is missing." },
      { requirement: "residenceProof", description: "Proof of residence or shelter status is missing." },
      { requirement: "incomeProof", description: "Income documentation is missing." },
      { requirement: "householdComposition", description: "Household composition details are missing." },
      { requirement: "deadlinesNote", description: "Deadlines acknowledgment (10-day documents, 7-day interview, 30-day determination) is missing." },
    ]);
  });

  it("treats false evidence as a gap while preserving requirements marked true", () => {
    expect(
      findClaimGaps({
        householdMembersId: false,
        residenceProof: true,
        incomeProof: false,
      }),
    ).toEqual([
      { requirement: "householdMembersId", description: "ID for all household members is missing." },
      { requirement: "incomeProof", description: "Income documentation is missing." },
      { requirement: "householdComposition", description: "Household composition details are missing." },
      { requirement: "deadlinesNote", description: "Deadlines acknowledgment (10-day documents, 7-day interview, 30-day determination) is missing." },
    ]);
  });

  it("returns no gaps when all five SNAP evidence requirements are documented", () => {
    expect(
      findClaimGaps({
        householdMembersId: true,
        residenceProof: true,
        incomeProof: true,
        householdComposition: true,
        deadlinesNote: true,
      }),
    ).toEqual([]);
  });
});
