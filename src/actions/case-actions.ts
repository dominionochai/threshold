import { defineAction } from "@agent-native/core";
import { getDbExec } from "@agent-native/core/db";
import { z } from "zod";
import { initDb } from "../db/schema";
import { NEEDS, type CaseRecord, type ClaimEvidence } from "../engine/types";

const STATUSES = ["waiting", "calling", "confirmed", "declined"] as const;
const REQUIREMENTS = ["householdMembersId", "residenceProof", "incomeProof", "householdComposition", "deadlinesNote"] as const;

let ready: Promise<void> | undefined;
const db = () => (ready ??= initDb()).then(getDbExec);

async function householdId(): Promise<string> {
  const { rows } = await (await db()).execute("SELECT id FROM households ORDER BY id DESC LIMIT 1");
  if (!rows[0]) throw new Error("No active household case found.");
  return rows[0].id;
}

async function appendEvent(hid: string, type: string, description: string) {
  const event = { id: `ev-${crypto.randomUUID()}`, timestamp: Date.now(), type, description };
  await (await db()).execute({
    sql: "INSERT INTO events (id, household_id, timestamp, type, description) VALUES ($1,$2,$3,$4,$5)",
    args: [event.id, hid, event.timestamp, type, description],
  });
  return event;
}

export async function getCaseState(): Promise<CaseRecord | null> {
  const exec = await db();
  const { rows: [hh] } = await exec.execute("SELECT * FROM households ORDER BY id DESC LIMIT 1");
  if (!hh) return null;
  const byHousehold = (table: string, order = "") =>
    exec.execute({ sql: `SELECT * FROM ${table} WHERE household_id = $1 ${order}`, args: [hh.id] }).then((r) => r.rows);
  const [steps, events, reqs, needs] = await Promise.all([
    byHousehold("steps"), byHousehold("events", "ORDER BY timestamp DESC"),
    byHousehold("claim_requirements"), byHousehold("needs", "ORDER BY priority"),
  ]);
  const evidence: ClaimEvidence = {};
  for (const r of reqs) evidence[z.enum(REQUIREMENTS).parse(r.requirement)] = r.verified;
  return {
    id: hh.id,
    children: JSON.parse(hh.children),
    needs: needs.map((n) => z.enum(NEEDS).parse(n.need)),
    location: hh.location,
    language: hh.language,
    secondaryLanguage: hh.secondary_language ?? undefined,
    evidence,
    steps: steps.map((s) => ({ id: s.id, need: z.enum(NEEDS).parse(s.need), status: z.enum(STATUSES).parse(s.status), resourceId: s.resource_id ?? undefined })),
    events: events.map((e) => ({ id: e.id, timestamp: Number(e.timestamp), type: e.type, description: e.description })),
  };
}

export const createCaseAction = defineAction({
  title: "Create Household Case",
  description: "Open a household case with its first steps and a CASE_INITIALIZED event.",
  schema: z.object({ location: z.string(), childrenAges: z.array(z.number()), language: z.string() }),
  run: async ({ location, childrenAges, language }) => {
    const exec = await db();
    const hid = `case-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await exec.execute({
      sql: "INSERT INTO households (id, children, location, language) VALUES ($1,$2,$3,$4)",
      args: [hid, JSON.stringify(childrenAges), location, language],
    });
    for (const [i, need] of (["bed", "food"] as const).entries()) {
      await exec.execute({ sql: "INSERT INTO needs (id, household_id, need, priority) VALUES ($1,$2,$3,$4)", args: [`need-${need}-${hid}`, hid, need, i] });
      await exec.execute({ sql: "INSERT INTO steps (id, household_id, need, status) VALUES ($1,$2,$3,'waiting')", args: [`step-${need}-${hid}`, hid, need] });
    }
    await appendEvent(hid, "CASE_INITIALIZED", `Household case initialized for ${location}.`);
    return { success: true, householdId: hid };
  },
});

export const logEventAction = defineAction({
  title: "Log Event",
  description: "Log an event to the activity trail ledger (claim evidence trail).",
  schema: z.object({ type: z.string(), description: z.string() }),
  run: async ({ type, description }) => {
    const event = await appendEvent(await householdId(), type, description);
    return { success: true, event, case: await getCaseState() };
  },
});

export const updateEvidenceAction = defineAction({
  title: "Update SNAP Claim Evidence",
  description: "Update SNAP claim requirement verification status.",
  schema: z.object({ requirement: z.enum(REQUIREMENTS), verified: z.boolean() }),
  run: async ({ requirement, verified }) => {
    const hid = await householdId();
    await (await db()).execute({
      sql: `INSERT INTO claim_requirements (id, household_id, requirement, verified) VALUES ($1,$2,$3,$4)
            ON CONFLICT (id) DO UPDATE SET verified = $4`,
      args: [`req-${requirement}-${hid}`, hid, requirement, verified],
    });
    await appendEvent(hid, "EVIDENCE_UPDATED", `SNAP requirement '${requirement}' marked as ${verified ? "verified" : "unverified"}.`);
    return { success: true, case: await getCaseState() };
  },
});

export const updateStepStatusAction = defineAction({
  title: "Update Step Status",
  description: "Update the status of a crisis outreach step (waiting, calling, confirmed, declined).",
  schema: z.object({ stepId: z.string(), status: z.enum(STATUSES) }),
  run: async ({ stepId, status }) => {
    const hid = await householdId();
    const { rowsAffected } = await (await db()).execute({
      sql: "UPDATE steps SET status = $1 WHERE id = $2 AND household_id = $3", args: [status, stepId, hid],
    });
    if (!rowsAffected) throw new Error(`Unknown step: ${stepId}`);
    await appendEvent(hid, "STEP_STATUS_CHANGED", `Step ${stepId} status changed to '${status}'.`);
    return { success: true, case: await getCaseState() };
  },
});
