import { z } from "zod";
import type { ScoutResult } from "./scout";

export const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  reason: z.string(),
  sourceUrl: z.url(),
});
export type Edge = z.infer<typeof edgeSchema>;

export interface Fallback {
  next: ScoutResult;
  /** The sourced referral that links the failed place to `next`; null when it is only the next best option. */
  via: Edge | null;
}

/**
 * Where to go when a place says no. Prefer places reachable through sourced referral
 * edges from the failed one; otherwise fall back to the next best ranked option.
 */
export function fallback(failedId: string, edges: readonly Edge[], ranked: readonly ScoutResult[]): Fallback | null {
  const via = new Map<string, Edge>();
  const queue = [failedId];
  for (const id of queue) {
    for (const edge of edges) {
      if (edge.from === id && edge.to !== failedId && !via.has(edge.to)) {
        via.set(edge.to, edge);
        queue.push(edge.to);
      }
    }
  }
  const viable = ranked.filter((r) => r.resource.id !== failedId && r.openness.status !== "closed");
  const linked = viable.find((r) => via.has(r.resource.id));
  const next = linked ?? viable[0];
  return next ? { next, via: linked ? (via.get(linked.resource.id) ?? null) : null } : null;
}
