import type { Resource } from "../resource";
import type { Household } from "../types";

/** Test-only records. Nothing here ships as app data. */
export const household: Household = {
  id: "household-1",
  children: [4, 7],
  needs: ["bed"],
  location: "Mott Haven",
  language: "English",
};

export const resource = (overrides: Partial<Resource> = {}): Resource => ({
  id: "resource-1",
  name: "Test place",
  kind: "bed",
  borough: "Bronx",
  lat: 40.8089,
  lng: -73.9229,
  address: "1 Test St",
  hours: "24/7",
  acceptsChildren: true,
  agesServed: [{ minAge: 0, maxAge: 17 }],
  phone: null,
  sourceUrl: "https://example.org",
  verifiedAt: "2026-01-15",
  conflictNote: null,
  ...overrides,
});
