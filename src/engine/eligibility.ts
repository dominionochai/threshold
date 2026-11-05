import type { Household, Resource } from "./types";

/** A child household qualifies only when acceptance and every child's age are known. */
export function acceptsHousehold(
  resource: Resource,
  household: Household
): boolean {
  if (household.children.length === 0) return true;
  if (resource.acceptsChildren !== true || resource.agesServed === null) {
    return false;
  }

  return household.children.every((age) => {
    if (!Number.isFinite(age) || age < 0) return false;
    return resource.agesServed!.some(
      (range) =>
        Number.isFinite(range.minAge) &&
        Number.isFinite(range.maxAge) &&
        range.minAge <= range.maxAge &&
        age >= range.minAge &&
        age <= range.maxAge
    );
  });
}
