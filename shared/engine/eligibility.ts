import type { Resource } from "./resource";
import type { Household } from "./types";

/** A child household qualifies only when acceptance and every child's age are known. */
export function acceptsHousehold(resource: Resource, household: Household): boolean {
  if (household.children.length === 0) return true;
  const ranges = resource.agesServed;
  if (resource.acceptsChildren !== true || ranges === null) return false;
  return household.children.every((age) => ranges.some((r) => age >= r.minAge && age <= r.maxAge));
}
