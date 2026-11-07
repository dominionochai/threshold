import { describe, expect, it } from "vitest";
import { scout } from "../scout";
import { household, resource } from "./fixtures";

const origin = { lat: 40.8089, lng: -73.9229 };
const at = new Date("2026-11-04T10:00:00-05:00");
const ids = (results: ReturnType<typeof scout>) => results.map((r) => r.resource.id);
const rank = (...resources: ReturnType<typeof resource>[]) => scout(resources, household, origin, "bed", at);

describe("scout", () => {
  it("ranks open before unknown before closed", () => {
    const closed = resource({ id: "closed", hours: { wed: [["20:00", "22:00"]] } });
    const unknown = resource({ id: "unknown", hours: null });
    const open = resource({ id: "open" });
    expect(ids(rank(closed, unknown, open))).toEqual(["open", "unknown", "closed"]);
  });

  it("puts unverified below verified at the same openness, then sorts by distance", () => {
    const unverifiedNear = resource({ id: "unverified-near", verifiedAt: null });
    const verifiedFar = resource({ id: "verified-far", lat: 40.9, lng: -73.8 });
    const verifiedNear = resource({ id: "verified-near" });
    expect(ids(rank(unverifiedNear, verifiedFar, verifiedNear))).toEqual(["verified-near", "verified-far", "unverified-near"]);
  });

  it("drops other needs and places that cannot take the children", () => {
    const food = resource({ id: "food", kind: "food" });
    const adultsOnly = resource({ id: "adults-only", acceptsChildren: false });
    const tooYoung = resource({ id: "too-young", agesServed: [{ minAge: 10, maxAge: 17 }] });
    expect(rank(food, adultsOnly, tooYoung)).toEqual([]);
  });

  it("explains each result in plain words", () => {
    const [result] = rank(resource({ hours: { wed: [["09:00", "21:00"]] }, verifiedAt: null, conflictNote: "two phone numbers" }));
    expect(result?.reasons).toEqual(["Open until 9:00 PM", "Takes ages 4, 7", "0.0 mi", "Unverified", "Sources conflict: two phone numbers"]);
  });
});
