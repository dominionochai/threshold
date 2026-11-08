import type { CallOutcome, Need } from "./types";

/** Activity-trail event types. The trail is the team's shared voice and the claim's evidence. */
export const EVENT = {
  CASE_OPENED: "CASE_OPENED",
  SCOUT_FOUND: "SCOUT_FOUND",
  CALLER_DRAFTED: "CALLER_DRAFTED",
  APPROVAL_GRANTED: "APPROVAL_GRANTED",
  APPROVAL_DECLINED: "APPROVAL_DECLINED",
  PATHFINDER_NEXT: "PATHFINDER_NEXT",
  HELP_311: "HELP_311",
  EVIDENCE_UPDATED: "EVIDENCE_UPDATED",
  STEP_STATUS_CHANGED: "STEP_STATUS_CHANGED",
} as const;

/** The call result is per need so the claim can tell a confirmed bed from a confirmed meal. */
export const callEvent = (outcome: CallOutcome, need: Need) => `CALL_${outcome.toUpperCase()}_${need.toUpperCase()}`;

export type Worker = "Scout" | "Caller" | "Pathfinder" | "Claim clerk" | "Case";

/** Who is speaking, so she can see which helper said what. Null means plumbing she does not need to read. */
export function workerOf(type: string): Worker | null {
  if (type === EVENT.SCOUT_FOUND) return "Scout";
  if (type === EVENT.CALLER_DRAFTED || type === EVENT.APPROVAL_GRANTED || type === EVENT.APPROVAL_DECLINED || type.startsWith("CALL_")) return "Caller";
  if (type === EVENT.PATHFINDER_NEXT || type === EVENT.HELP_311) return "Pathfinder";
  if (type === EVENT.EVIDENCE_UPDATED) return "Claim clerk";
  if (type === EVENT.CASE_OPENED) return "Case";
  return null;
}
