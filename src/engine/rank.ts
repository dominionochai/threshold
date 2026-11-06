import { acceptsHousehold } from "./eligibility";
import type { Household, Resource } from "./types";

function hasVerification(resource: Resource): boolean {
  return typeof resource.verifiedAt === "string" && resource.verifiedAt.trim().length > 0;
}

function distanceRank(resource: Resource): number {
  if (resource.distanceKm === null || resource.distanceKm === undefined) {
    return 1000000;
  }
  if (typeof resource.distanceKm === "number" && Number.isNaN(resource.distanceKm)) {
    return 2000000;
  }
  if (
    typeof resource.distanceKm === "number" &&
    Number.isFinite(resource.distanceKm) &&
    resource.distanceKm >= 0
  ) {
    return resource.distanceKm;
  }
  return 1000000;
}

function childAcceptanceRank(resource: Resource): number {
  if (resource.acceptsChildren === true) return 0;
  if (resource.acceptsChildren === false) return 1;
  return 2;
}

/** Return only verified, eligible resources explicitly open now. */
export function rankResources(
  resources: readonly Resource[],
  household: Household
): Resource[] {
  return resources
    .filter(
      (resource) =>
        hasVerification(resource) &&
        acceptsHousehold(resource, household) &&
        resource.openNow === true
    )
    .slice()
    .sort(
      (left, right) =>
        distanceRank(left) - distanceRank(right) ||
        childAcceptanceRank(left) - childAcceptanceRank(right)
    );
}
