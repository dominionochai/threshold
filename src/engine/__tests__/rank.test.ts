import { describe, expect, it } from "vitest";
import { rankResources } from "../rank";
import type { Household, Resource } from "../types";

const household: Household = {
  id: "household-1",
  children: [8],
  needs: ["bed"],
  location: "Columbus, OH",
  language: "English",
};

const resource = (id: string, overrides: Partial<Resource> = {}): Resource => ({
  id,
  name: id,
  kind: "shelter",
  distanceKm: 10,
  acceptsChildren: true,
  agesServed: [{ minAge: 0, maxAge: 17 }],
  hours: "24/7",
  openNow: true,
  phone: null,
  address: null,
  sourceUrl: "https://example.org",
  verifiedAt: "2026-01-15",
  ...overrides,
});

describe("rankResources", () => {
  it("filters out unverified, closed, and household-ineligible resources", () => {
    const eligible = resource("eligible");
    const unverified = resource("unverified", { verifiedAt: null });
    const closed = resource("closed", { openNow: false });
    const declinesChildren = resource("declines-children", { acceptsChildren: false });
    const wrongAgeRange = resource("wrong-age", { agesServed: [{ minAge: 10, maxAge: 17 }] });

    expect(
      rankResources([eligible, unverified, closed, declinesChildren, wrongAgeRange], household).map(
        ({ id }) => id,
      ),
    ).toEqual(["eligible"]);
  });

  it("sorts eligible resources by distance, then child-acceptance preference on a tie", () => {
    const emptyHousehold = { ...household, children: [] };
    const farther = resource("farther", { distanceKm: 8, acceptsChildren: true });
    const closerButUnspecified = resource("closer-unspecified", {
      distanceKm: 2,
      acceptsChildren: null,
      agesServed: null,
    });
    const tiedUnspecified = resource("tied-unspecified", {
      distanceKm: 2,
      acceptsChildren: null,
      agesServed: null,
    });
    const tiedChildFriendly = resource("tied-child-friendly", {
      distanceKm: 2,
      acceptsChildren: true,
    });

    expect(
      rankResources([farther, tiedUnspecified, tiedChildFriendly, closerButUnspecified], emptyHousehold).map(
        ({ id }) => id,
      ),
    ).toEqual(["tied-child-friendly", "tied-unspecified", "closer-unspecified", "farther"]);
  });

  it("ranks unknown or invalid distances after finite nonnegative distances", () => {
    const nearby = resource("nearby", { distanceKm: 1 });
    const noDistance = resource("no-distance", { distanceKm: null });
    const invalidDistance = resource("invalid-distance", { distanceKm: Number.NaN });

    expect(rankResources([invalidDistance, noDistance, nearby], household).map(({ id }) => id)).toEqual([
      "nearby",
      "no-distance",
      "invalid-distance",
    ]);
  });
});
