import { acceptsHousehold } from "./eligibility";
import { distanceKm, type LatLng } from "./geo";
import { openness, type Openness } from "./hours";
import type { Resource } from "./resource";
import type { Household, Need } from "./types";

export interface ScoutResult {
  resource: Resource;
  openness: Openness;
  distanceKm: number;
  verified: boolean;
  reasons: string[];
}

const KM_TO_MILES = 0.621371;
const STATUS_ORDER = { open: 0, unknown: 1, closed: 2 } as const;

const tier = (r: ScoutResult) => STATUS_ORDER[r.openness.status] * 2 + (r.verified ? 0 : 1);

function formatClock(clock: string): string {
  const hour = Number(clock.slice(0, 2));
  return `${hour % 12 || 12}:${clock.slice(3)} ${hour < 12 ? "AM" : "PM"}`;
}

function hoursReason(o: Openness): string {
  if (o.status === "unknown") return "Hours unknown";
  if (o.status === "closed") return "Closed now";
  return o.closes ? `Open until ${formatClock(o.closes)}` : "Open 24 hours";
}

/** Rank places for one need: open before unknown before closed, verified before unverified, then nearest. */
export function scout(
  resources: readonly Resource[],
  household: Household,
  origin: LatLng,
  need: Need,
  at: Date,
): ScoutResult[] {
  return resources
    .filter((r) => r.kind === need && acceptsHousehold(r, household))
    .map((resource) => {
      const status = openness(resource.hours, at);
      const km = distanceKm(origin, resource);
      const verified = resource.verifiedAt !== null;
      const reasons = [
        hoursReason(status),
        ...(household.children.length ? [`Takes ages ${household.children.join(", ")}`] : []),
        `${(km * KM_TO_MILES).toFixed(1)} mi`,
        ...(verified ? [] : ["Unverified"]),
        ...(resource.conflictNote ? [`Sources conflict: ${resource.conflictNote}`] : []),
      ];
      return { resource, openness: status, distanceKm: km, verified, reasons };
    })
    .sort((a, b) => tier(a) - tier(b) || a.distanceKm - b.distanceKm);
}
