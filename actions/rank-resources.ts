import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { edges, resources } from "../shared/data/resources.js";
import { findNeighborhood } from "../shared/data/neighborhoods.js";
import { fallback } from "../shared/engine/pathfinder.js";
import { scout } from "../shared/engine/scout.js";
import { loadCase } from "../server/lib/case.js";

const PER_NEED = 5;

export default defineAction({
  description:
    "Scout: for each need on the open case, rank real, sourced places that take this household, open-now first, verified before unverified, then nearest. Also gives the sourced fallback if the top pick says no. Pass `at` to rank for another moment.",
  schema: z.object({ at: z.iso.datetime().optional() }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ at }) => {
    const household = await loadCase();
    if (!household) throw new Error("No case is open. Create one first.");
    const origin = findNeighborhood(household.location);
    if (!origin) throw new Error(`Unknown neighborhood: ${household.location}`);

    return Object.fromEntries(
      household.needs.map((need) => {
        const ranked = scout(resources, household, origin, need, at ? new Date(at) : new Date());
        return [need, { options: ranked.slice(0, PER_NEED), ifDeclined: ranked[0] ? fallback(ranked[0].resource.id, edges, ranked) : null }];
      }),
    );
  },
});
