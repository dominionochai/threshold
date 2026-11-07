import { describe, expect, it } from "vitest";
import { callerPrompt, evidenceFor, stepStatusFor, toContents, transcriptText, type Outcome } from "../call";
import { household, resource } from "./fixtures";

const outcome = (result: Outcome["result"]): Outcome => ({ result, summary: "s", instructions: [], spokeWith: null });

describe("call outcomes", () => {
  it("maps what was said to the step's status", () => {
    expect(stepStatusFor(outcome("confirmed"))).toBe("confirmed");
    expect(stepStatusFor(outcome("declined"))).toBe("declined");
    expect(stepStatusFor(outcome("callback"))).toBe("waiting");
    expect(stepStatusFor(outcome("unclear"))).toBe("waiting");
  });

  it("links a confirmed bed to the residence requirement, and nothing else", () => {
    expect(evidenceFor("bed", outcome("confirmed"))).toBe("residenceProof");
    expect(evidenceFor("bed", outcome("declined"))).toBeNull();
    expect(evidenceFor("food", outcome("confirmed"))).toBeNull();
  });
});

describe("callerPrompt", () => {
  const prompt = callerPrompt(household, resource({ name: "PATH" }), "bed");

  it("shares only the ages, neighborhood and need", () => {
    expect(prompt).toContain("ages 4 and 7");
    expect(prompt).toContain("Mott Haven");
    expect(prompt).toContain("tonight she needs bed");
  });

  it("makes the assistant say what it is and forbids inventing facts", () => {
    expect(prompt).toContain("you are an assistant calling for a family");
    expect(prompt).toContain("Never invent or volunteer");
  });
});

it("renders a transcript with who said what", () => {
  expect(transcriptText([{ who: "agent", text: "Hi" }, { who: "shelter", text: "Hello" }])).toBe("Assistant: Hi\nStaff: Hello");
});

describe("toContents", () => {
  const roles = (turns: Parameters<typeof toContents>[0]) => toContents(turns).map((c) => c.role);

  it("always starts with the user, so the opening line is allowed", () => {
    expect(roles([])).toEqual(["user"]);
    expect(roles([{ who: "agent", text: "Hi" }])).toEqual(["user", "model"]);
  });

  it("alternates, and merges two lines from the same side", () => {
    const merged = toContents([
      { who: "agent", text: "Hi" },
      { who: "shelter", text: "Hello" },
      { who: "shelter", text: "Who is this?" },
    ]);
    expect(merged.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(merged[2]?.parts).toHaveLength(2);
  });
});
