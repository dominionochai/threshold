import { describe, expect, it } from "vitest";
import { fallback, type Edge } from "../pathfinder";
import { scout } from "../scout";
import { household, resource } from "./fixtures";

const origin = { lat: 40.8089, lng: -73.9229 };
const at = new Date("2026-11-04T10:00:00-05:00");
const edge = (from: string, to: string): Edge => ({ from, to, reason: "referral", sourceUrl: "https://example.org" });
const ranked = (...resources: ReturnType<typeof resource>[]) => scout(resources, household, origin, "bed", at);

describe("fallback", () => {
  const first = resource({ id: "first" });
  const near = resource({ id: "near", lat: 40.81, lng: -73.92 });
  const linked = resource({ id: "linked", lat: 40.95, lng: -73.7 });

  it("prefers a place reachable through a sourced referral over a nearer one", () => {
    const result = fallback("first", [edge("first", "linked")], ranked(first, near, linked));
    expect(result?.next.resource.id).toBe("linked");
    expect(result?.via?.from).toBe("first");
  });

  it("follows referrals more than one hop", () => {
    const result = fallback("first", [edge("first", "near"), edge("near", "linked")], ranked(first, linked));
    expect(result?.next.resource.id).toBe("linked");
  });

  it("falls back to the next best option when no referral applies", () => {
    const result = fallback("first", [], ranked(first, near));
    expect(result).toMatchObject({ next: { resource: { id: "near" } }, via: null });
  });

  it("skips closed places and returns null when nothing is left", () => {
    const closed = resource({ id: "closed", hours: { wed: [["20:00", "22:00"]] } });
    expect(fallback("first", [], ranked(first, closed))).toBeNull();
  });
});
