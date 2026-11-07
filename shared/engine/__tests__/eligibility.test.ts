import { describe, expect, it } from "vitest";
import { acceptsHousehold } from "../eligibility";
import { resource as base } from "./fixtures";
import type { Resource } from "../resource";
import type { Household } from "../types";

const household: Household = {
  id: "household-1",
  children: [5, 12, 15, 17],
  needs: ["food"],
  location: "Manhattan",
  language: "English",
};

const resource = (overrides: Partial<Resource> = {}) =>
  base({ agesServed: [{ minAge: 5, maxAge: 12 }, { minAge: 15, maxAge: 17 }], ...overrides });

describe("acceptsHousehold", () => {
  it("accepts households without children even when child acceptance is unavailable", () => {
    expect(
      acceptsHousehold(
        resource({ acceptsChildren: false, agesServed: null }),
        { ...household, children: [] },
      ),
    ).toBe(true);
  });

  it("rejects households with children when the resource does not accept children", () => {
    expect(acceptsHousehold(resource({ acceptsChildren: false }), household)).toBe(false);
    expect(acceptsHousehold(resource({ acceptsChildren: null }), household)).toBe(false);
  });

  it("requires a known served-age range for households with children", () => {
    expect(acceptsHousehold(resource({ agesServed: null }), household)).toBe(false);
  });

  it("accepts children at the inclusive boundaries of any served range", () => {
    expect(acceptsHousehold(resource(), household)).toBe(true);
  });

  it("rejects any child whose age falls outside every served range", () => {
    for (const age of [4, 13, 18]) {
      expect(acceptsHousehold(resource(), { ...household, children: [age] })).toBe(false);
    }
  });

  it("rejects negative and non-finite child ages", () => {
    for (const age of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(acceptsHousehold(resource(), { ...household, children: [age] })).toBe(false);
    }
  });
});
