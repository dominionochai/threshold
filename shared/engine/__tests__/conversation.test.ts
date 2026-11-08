import { describe, expect, it } from "vitest";
import { callerPrompt, outcomeFromStaff, scriptedStep, stepStatusFor, toContents, transcriptText, type Outcome, type Turn } from "../conversation";
import { household, resource } from "./fixtures";

const outcome = (result: Outcome["result"]): Outcome => ({ result, summary: "s", instructions: [], spokeWith: null });

describe("call outcomes", () => {
  it("maps what was said to the step's status", () => {
    expect(stepStatusFor(outcome("confirmed"))).toBe("confirmed");
    expect(stepStatusFor(outcome("declined"))).toBe("declined");
    expect(stepStatusFor(outcome("callback"))).toBe("waiting");
    expect(stepStatusFor(outcome("unclear"))).toBe("waiting");
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

describe("scripted call", () => {
  const lines = ["one", "two", "three"];

  it("advances one line per caller turn and ends the call on the last", () => {
    const turns: Turn[] = [];
    const said: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const { say, endCall } = scriptedStep(lines, turns);
      said.push(say);
      expect(endCall).toBe(i === lines.length - 1);
      turns.push({ who: "agent", text: say }, { who: "shelter", text: "ok" });
    }
    expect(said).toEqual(lines);
  });
});

describe("outcomeFromStaff", () => {
  const staff = (...text: string[]): Turn[] => text.map((t) => ({ who: "shelter", text: t }));

  it("reads a yes with what to bring and by when", () => {
    const outcome = outcomeFromStaff(staff("Yes, we have a family room.", "Come before nine tonight. Bring ID for everyone."), "PATH");
    expect(outcome.result).toBe("confirmed");
    expect(outcome.instructions).toEqual(["Come before nine tonight", "Bring ID for everyone"]);
  });

  it("reads a no, and refuses to guess when it is neither", () => {
    expect(outcomeFromStaff(staff("Sorry, we're full tonight."), "PATH").result).toBe("declined");
    expect(outcomeFromStaff(staff("Let me check on that."), "PATH").result).toBe("unclear");
  });

  it("treats a call where staff said nothing as unanswered", () => {
    expect(outcomeFromStaff([], "PATH").result).toBe("unclear");
  });
});
