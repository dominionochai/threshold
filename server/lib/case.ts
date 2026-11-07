import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { APPROVAL_STATUSES, NEEDS, STEP_STATUSES, CLAIM_REQUIREMENTS, type CaseRecord } from "../../shared/engine/types.js";
import { getDb, schema } from "../db/index.js";

const need = z.enum(NEEDS);
const status = z.enum(STEP_STATUSES);
const requirement = z.enum(CLAIM_REQUIREMENTS);
const approvalStatus = z.enum(APPROVAL_STATUSES);
const outcome = z.enum(["confirmed", "declined"]);

export async function loadCase(): Promise<CaseRecord | null> {
  const db = getDb();
  const [household] = await db.select().from(schema.households).orderBy(desc(schema.households.createdAt)).limit(1);
  if (!household) return null;

  const [needs, steps, events, requirements, approvals] = await Promise.all([
    db.select().from(schema.needs).where(eq(schema.needs.householdId, household.id)).orderBy(schema.needs.priority),
    db.select().from(schema.steps).where(eq(schema.steps.householdId, household.id)).orderBy(schema.steps.id),
    db.select().from(schema.events).where(eq(schema.events.householdId, household.id)).orderBy(desc(schema.events.timestamp)),
    db.select().from(schema.claimRequirements).where(eq(schema.claimRequirements.householdId, household.id)),
    db.select().from(schema.approvals).where(eq(schema.approvals.householdId, household.id)).orderBy(desc(schema.approvals.createdAt)),
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
    approvals: approvals.map((a) => ({
      id: a.id,
      stepId: a.stepId,
      resourceId: a.resourceId,
      need: need.parse(a.need),
      script: a.script,
      status: approvalStatus.parse(a.status),
      outcome: a.outcome === null ? null : outcome.parse(a.outcome),
      transcript: a.transcript,
      createdAt: a.createdAt,
      decidedAt: a.decidedAt,
    })),
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
