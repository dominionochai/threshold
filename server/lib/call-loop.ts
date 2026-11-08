import { findNeighborhood } from "../../shared/data/neighborhoods.js";
import { edges, resources } from "../../shared/data/resources.js";
import { cityHelp, draftCall } from "../../shared/engine/call.js";
import { stepStatusFor, type Outcome } from "../../shared/engine/conversation.js";
import { callEvent, EVENT } from "../../shared/engine/events.js";
import { fallback } from "../../shared/engine/pathfinder.js";
import type { Resource } from "../../shared/engine/resource.js";
import { scout, type ScoutResult } from "../../shared/engine/scout.js";
import type { Approval, CallOutcome, CaseRecord, CaseStep, Need, TranscriptLine, Turn } from "../../shared/engine/types.js";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/index.js";
import { isScripted } from "./call-mode.js";
import { appendEvent } from "./case.js";

export function findResource(id: string): Resource {
  const resource = resources.find((r) => r.id === id);
  if (!resource) throw new Error(`Unknown place: ${id}. Only places from Scout can be called.`);
  return resource;
}

export function rankFor(record: CaseRecord, need: Need, at: Date): ScoutResult[] {
  const origin = findNeighborhood(record.location);
  if (!origin) throw new Error(`Unknown neighborhood: ${record.location}`);
  return scout(resources, record, origin, need, at);
}

/** Draft a call and park it for approval. Nothing is placed here. */
export async function draftApproval(record: CaseRecord, stepId: string, resourceId: string) {
  const step = record.steps.find((s) => s.id === stepId);
  if (!step) throw new Error(`Unknown step: ${stepId}`);
  const resource = findResource(resourceId);
  if (resource.kind !== step.need) throw new Error(`${resource.name} does not help with ${step.need}.`);
  if (record.approvals.some((a) => a.stepId === stepId && a.status === "pending")) {
    throw new Error("A call for this step is already waiting for your yes.");
  }

  const approval = {
    id: `appr-${crypto.randomUUID()}`,
    householdId: record.id,
    stepId,
    resourceId,
    need: step.need,
    script: draftCall(record, step.need),
    status: "pending",
    createdAt: Date.now(),
  };
  await getDb().insert(schema.approvals).values(approval);
  await appendEvent(record.id, EVENT.CALLER_DRAFTED, `Caller drafted a call to ${resource.name}. It's waiting for your yes. Nothing has been sent.`);
  return approval.id;
}

/** After a "no": point to the next sourced place, or say plainly that 311 is the way forward. */
export async function afterDecline(record: CaseRecord, stepId: string, need: Need, failedId: string, at: Date) {
  const ranked = rankFor(record, need, at);
  const next = fallback(failedId, edges, ranked);
  if (!next) {
    await appendEvent(record.id, EVENT.HELP_311, `Pathfinder has no other sourced ${need === "bed" ? "bed" : need === "medical" ? "clinic" : "place"} on file. ${cityHelp(record, need)}`);
    return null;
  }
  const via = next.via ? ` ${next.via.reason}.` : "";
  await appendEvent(record.id, EVENT.PATHFINDER_NEXT, `Pathfinder found the next best place: ${next.next.resource.name}.${via} Caller drafted a call for your yes.`);
  return draftApproval({ ...record, approvals: record.approvals.filter((a) => a.status !== "pending" || a.stepId !== stepId) }, stepId, next.next.resource.id);
}

/** Ring the staff line for an approved call. The call stays open until the staff line finishes it. */
export async function startCall(record: CaseRecord, approval: Approval, resource: Resource) {
  if (record.activeCall) throw new Error("A call is already open.");
  await getDb().insert(schema.calls).values({
    id: `call-${crypto.randomUUID()}`,
    householdId: record.id,
    stepId: approval.stepId,
    resourceId: resource.id,
    approvalId: approval.id,
    status: "ringing",
    transcript: [],
    startedAt: Date.now(),
  });
  await appendEvent(record.id, "CALL_PLACED", `Caller is calling ${resource.name} now.`);
}

/** Write a finished call into the case the way the parent sees it: the approval, the step, and the trail. */
export async function recordCallResult(record: CaseRecord, call: { approvalId: string | null }, resource: Resource, step: CaseStep, outcome: Outcome, turns: readonly Turn[]) {
  const result: CallOutcome | null = outcome.result === "confirmed" ? "confirmed" : outcome.result === "declined" ? "declined" : null;
  const db = getDb();
  if (call.approvalId) {
    const transcript = turns.map((t): TranscriptLine => ({ speaker: t.who === "agent" ? "assistant" : "facility", text: t.text }));
    await db.update(schema.approvals).set({ outcome: result, transcript }).where(and(eq(schema.approvals.id, call.approvalId), eq(schema.approvals.householdId, record.id)));
  }
  await db.update(schema.steps).set({ status: stepStatusFor(outcome) }).where(and(eq(schema.steps.id, step.id), eq(schema.steps.householdId, record.id)));

  const label = `Caller${isScripted() ? " (scripted demo call)" : ""}`;
  const todo = outcome.instructions.length ? ` To do: ${outcome.instructions.join("; ")}.` : "";
  if (result === "confirmed") {
    await appendEvent(record.id, callEvent("confirmed", step.need), `${label}: ${resource.name} said yes. Go to ${resource.address}.${todo}`);
  } else if (result === "declined") {
    await appendEvent(record.id, callEvent("declined", step.need), `${label}: ${resource.name} said no. ${outcome.summary}`);
    await afterDecline(record, step.id, step.need, resource.id, new Date());
  } else {
    await appendEvent(record.id, "CALL_UNCLEAR", `${label}: ${outcome.summary}`);
  }
}
