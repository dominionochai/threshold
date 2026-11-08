import { describe, expect, it } from "vitest";
import { draftCall, simulateCall } from "../call";
import { household, resource } from "./fixtures";

const wedMorning = new Date("2026-11-04T10:00:00-05:00");

describe("draftCall", () => {
  it("says it is an assistant, names the children's ages and asks the two things that matter", () => {
    const script = draftCall(household, "bed");
    expect(script[0]).toMatch(/assistant/);
    expect(script[1]).toContain("2 children");
    expect(script[1]).toContain("4 and 7");
    expect(script.join(" ")).toMatch(/open right now/);
  });
});

describe("simulateCall", () => {
  const script = draftCall(household, "bed");

  it("confirms an open place and takes the address and note only from the record", () => {
    const result = simulateCall(resource({ address: "9 Real St", note: "Bring ID." }), script, wedMorning);
    expect(result.outcome).toBe("confirmed");
    expect(result.transcript.find((l) => l.speaker === "facility" && l.text.includes("9 Real St"))?.text).toContain("Bring ID.");
  });

  it("declines a closed place and says why", () => {
    const result = simulateCall(resource({ hours: { wed: [["20:00", "22:00"]] } }), script, wedMorning);
    expect(result.outcome).toBe("declined");
    expect(result.reason).toBe("Closed now.");
  });

  it("does not confirm a place with no hours on file", () => {
    expect(simulateCall(resource({ hours: null }), script, wedMorning).outcome).toBe("declined");
  });

  it("lets a demo force a decline", () => {
    expect(simulateCall(resource(), script, wedMorning, "declines").outcome).toBe("declined");
  });
});
