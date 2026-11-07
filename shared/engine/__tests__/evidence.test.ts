import { describe, expect, it } from "vitest";
import { callEvent, EVENT, workerOf } from "../events";
import { linkEvidence } from "../evidence";
import type { CaseEvent } from "../types";

const ev = (type: string, timestamp: number): CaseEvent => ({ id: `${type}-${timestamp}`, timestamp, type, description: type });
const state = (links: ReturnType<typeof linkEvidence>, key: string) => links.find((l) => l.requirement === key)?.state;

describe("linkEvidence", () => {
  it("backs household composition from the opened case and nothing else", () => {
    const links = linkEvidence([ev(EVENT.CASE_OPENED, 1)]);
    expect(state(links, "householdComposition")).toBe("backed");
    expect(state(links, "residenceProof")).toBe("missing");
    expect(state(links, "incomeProof")).toBe("missing");
  });

  it("backs residence only from a confirmed bed, never a declined one or a confirmed meal", () => {
    expect(state(linkEvidence([ev(callEvent("declined", "bed"), 1), ev(callEvent("confirmed", "food"), 2)]), "residenceProof")).toBe("missing");
    expect(state(linkEvidence([ev(callEvent("confirmed", "bed"), 3)]), "residenceProof")).toBe("backed");
  });

  it("only the person can make something ready", () => {
    const links = linkEvidence([ev(callEvent("confirmed", "bed"), 1)], { residenceProof: true, incomeProof: true });
    expect(state(links, "residenceProof")).toBe("ready");
    expect(state(links, "incomeProof")).toBe("ready");
  });

  it("returns the proof newest first", () => {
    const links = linkEvidence([ev(callEvent("confirmed", "bed"), 1), ev(callEvent("confirmed", "bed"), 9)]);
    expect(links.find((l) => l.requirement === "residenceProof")?.proof.map((e) => e.timestamp)).toEqual([9, 1]);
  });
});

describe("workerOf", () => {
  it("names the helper behind each kind of message and hides plumbing", () => {
    expect(workerOf(EVENT.SCOUT_FOUND)).toBe("Scout");
    expect(workerOf(callEvent("confirmed", "bed"))).toBe("Caller");
    expect(workerOf(EVENT.PATHFINDER_NEXT)).toBe("Pathfinder");
    expect(workerOf(EVENT.STEP_STATUS_CHANGED)).toBeNull();
  });
});
