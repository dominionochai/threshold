import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { turnSchema } from "../../shared/engine/call.js";
import { NEEDS, STEP_STATUSES, CLAIM_REQUIREMENTS, type CaseRecord } from "../../shared/engine/types.js";
import { resources } from "../../shared/data/resources.js";
import { getDb, schema } from "../db/index.js";
import { isScripted } from "./call-mode.js";

const need = z.enum(NEEDS);
const status = z.enum(STEP_STATUSES);
const requirement = z.enum(CLAIM_REQUIREMENTS);
const callStatus = z.enum(["ringing", "live"]);
const OPEN_CALL = callStatus.options;
const turns = z.array(turnSchema);

export async function loadCase(): Promise<CaseRecord | null> {
  const db = getDb();
  const [household] = await db.select().from(schema.households).orderBy(desc(schema.households.createdAt)).limit(1);
  if (!household) return null;

  const [needs, steps, events, requirements, [ringing]] = await Promise.all([
    db.select().from(schema.needs).where(eq(schema.needs.householdId, household.id)).orderBy(schema.needs.priority),
    db.select().from(schema.steps).where(eq(schema.steps.householdId, household.id)).orderBy(schema.steps.id),
    db.select().from(schema.events).where(eq(schema.events.householdId, household.id)).orderBy(desc(schema.events.timestamp)),
    db.select().from(schema.claimRequirements).where(eq(schema.claimRequirements.householdId, household.id)),
    db
      .select()
      .from(schema.calls)
      .where(and(eq(schema.calls.householdId, household.id), inArray(schema.calls.status, OPEN_CALL)))
      .orderBy(desc(schema.calls.startedAt))
      .limit(1),
  ]);

  return {
    id: household.id,
    children: household.children,
    location: household.location,
    language: household.language,
    needs: needs.map((n) => need.parse(n.need)),
    steps: steps.map((s) => ({ id: s.id, need: need.parse(s.need), status: status.parse(s.status), resourceId: s.resourceId })),
    events: events.map(({ id, timestamp, type, description }) => ({ id, timestamp, type, description })),
    evidence: Object.fromEntries(requirements.map((r) => [requirement.parse(r.requirement), r.verified])),
    evidenceLinks: Object.fromEntries(requirements.flatMap((r) => (r.eventId ? [[requirement.parse(r.requirement), r.eventId]] : []))),
    activeCall: ringing
      ? { id: ringing.id, stepId: ringing.stepId, resourceId: ringing.resourceId, resourceName: resources.find((r) => r.id === ringing.resourceId)?.name ?? ringing.resourceId, status: callStatus.parse(ringing.status), turns: turns.parse(ringing.transcript), scripted: isScripted() }
      : null,
  };
}

export async function currentHouseholdId(): Promise<string> {
  const [row] = await getDb().select({ id: schema.households.id }).from(schema.households).orderBy(desc(schema.households.createdAt)).limit(1);
  if (!row) throw new Error("No case is open. Create one first.");
  return row.id;
}

export async function appendEvent(householdId: string, type: string, description: string) {
  const event = { id: `ev-${crypto.randomUUID()}`, householdId, timestamp: Date.now(), type, description };
  await getDb().insert(schema.events).values(event);
  return { id: event.id, timestamp: event.timestamp, type, description };
}

/** The call plus what it concerns, or an error if it is not an open call on this case. */
export async function loadOpenCall(callId: string) {
  const [call] = await getDb().select().from(schema.calls).where(and(eq(schema.calls.id, callId), inArray(schema.calls.status, OPEN_CALL)));
  const resource = resources.find((r) => r.id === call?.resourceId);
  const household = await loadCase();
  if (!call || !resource || household?.id !== call.householdId) throw new Error(`No open call: ${callId}`);
  const step = household.steps.find((s) => s.id === call.stepId);
  if (!step) throw new Error(`Call ${callId} has no step`);
  return { call, resource, household, step };
}
