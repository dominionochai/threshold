import { expect, it } from "vitest";
import { resources } from "../../data/resources";
import { outcomeFromStaff, type Turn } from "../../engine/conversation";
import { DEMO_CALL } from "../call-script";

const transcript = (): Turn[] =>
  DEMO_CALL.agent.flatMap((line, i): Turn[] => [{ who: "agent", text: line.text }, ...(DEMO_CALL.staff[i] ? [{ who: "shelter" as const, text: DEMO_CALL.staff[i] }] : [])]);

it("has one more caller line than staff lines, each with its own voice file", () => {
  expect(DEMO_CALL.agent).toHaveLength(DEMO_CALL.staff.length + 1);
  expect(new Set(DEMO_CALL.agent.map((l) => l.id)).size).toBe(DEMO_CALL.agent.length);
});

it("reads as a confirmed placement with what to do next", () => {
  const outcome = outcomeFromStaff(transcript(), "PATH");
  expect(outcome.result).toBe("confirmed");
  expect(outcome.instructions).toHaveLength(2);
});

it("sends the family to the address PATH is actually listed at", () => {
  const path = resources.find((r) => r.id === "dhs-path");
  expect(path?.address).toContain("151 East 151st Street");
  expect(DEMO_CALL.staff.join(" ")).toContain("151 East 151st Street");
});
