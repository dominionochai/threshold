import { defineAction } from "@agent-native/core";
import { getDbExec } from "@agent-native/core/db";
import { z } from "zod";
import { initDb } from "../db/schema";
import type { CaseRecord, ClaimEvidence, CaseStep, CaseEvent } from "../engine/types";

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

interface HouseholdRow {
  id: string;
  children: string;
  location: string;
  language: string;
  secondary_language?: string;
}

interface StepRow {
  id: string;
  need: string;
  status: string;
  resource_id?: string;
}

interface EventRow {
  id: string;
  timestamp: number;
  type: string;
  description: string;
}

interface RequirementRow {
  requirement: string;
  verified: number;
}

interface NeedRow {
  need: string;
}

export async function getCaseState(): Promise<CaseRecord | null> {
  await ensureDb();
  const db = getDbExec();
  const hhRes = await db.execute("SELECT * FROM households LIMIT 1;");
  if (!hhRes.rows || hhRes.rows.length === 0) {
    return null;
  }
  const hh = hhRes.rows[0] as unknown as HouseholdRow;
  const householdId = hh.id;

  const stepsRes = await db.execute(`SELECT * FROM steps WHERE household_id = '${householdId}';`);
  const steps: CaseStep[] = (stepsRes.rows as unknown as StepRow[]).map((s) => ({
    id: s.id,
    need: s.need as any,
    status: s.status as any,
    resourceId: s.resource_id,
  }));

  const eventsRes = await db.execute(`SELECT * FROM events WHERE household_id = '${householdId}' ORDER BY timestamp DESC;`);
  const events: CaseEvent[] = (eventsRes.rows as unknown as EventRow[]).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    type: e.type,
    description: e.description,
  }));

  const reqsRes = await db.execute(`SELECT * FROM claim_requirements WHERE household_id = '${householdId}';`);
  const evidence: ClaimEvidence = {};
  for (const r of (reqsRes.rows as unknown as RequirementRow[])) {
    if (r.requirement === "householdMembersId") evidence.householdMembersId = r.verified === 1;
    if (r.requirement === "residenceProof") evidence.residenceProof = r.verified === 1;
    if (r.requirement === "incomeProof") evidence.incomeProof = r.verified === 1;
    if (r.requirement === "householdComposition") evidence.householdComposition = r.verified === 1;
    if (r.requirement === "deadlinesNote") evidence.deadlinesNote = r.verified === 1;
  }

  const needsRes = await db.execute(`SELECT need FROM needs WHERE household_id = '${householdId}';`);
  const needs = (needsRes.rows as unknown as NeedRow[]).map((n) => n.need as any);

  return {
    id: householdId,
    children: JSON.parse(hh.children || "[]"),
    needs,
    location: hh.location,
    language: hh.language,
    secondaryLanguage: hh.secondary_language || undefined,
    evidence,
    steps,
    events,
  };
}

export const createCaseAction = defineAction({
  title: "Create Household Case",
  description: "Initialize a new real household case record in the database.",
  schema: z.object({
    location: z.string(),
    childrenAges: z.array(z.number()),
    language: z.string(),
  }),
  run: async ({ location, childrenAges, language }) => {
    await ensureDb();
    const db = getDbExec();
    const householdId = `case-${Date.now()}`;
    const childrenJson = JSON.stringify(childrenAges);

    await db.execute(`INSERT INTO households (id, children, location, language) VALUES ('${householdId}', '${childrenJson}', '${location}', '${language}');`);
    await db.execute(`INSERT INTO steps (id, household_id, need, status) VALUES ('step-bed-${householdId}', '${householdId}', 'bed', 'waiting');`);
    await db.execute(`INSERT INTO steps (id, household_id, need, status) VALUES ('step-food-${householdId}', '${householdId}', 'food', 'waiting');`);
    
    const evId = `ev-${Date.now()}`;
    const ts = Date.now();
    await db.execute(`INSERT INTO events (id, household_id, timestamp, type, description) VALUES ('${evId}', '${householdId}', ${ts}, 'CASE_INITIALIZED', 'Household case initialized for ${location}.');`);

    return { success: true, householdId };
  },
});

export const logEventAction = defineAction({
  title: "Log Event",
  description: "Log an event to the activity trail ledger (claim evidence trail).",
  schema: z.object({
    type: z.string(),
    description: z.string(),
  }),
  run: async ({ type, description }) => {
    await ensureDb();
    const db = getDbExec();
    const hhRes = await db.execute("SELECT id FROM households LIMIT 1;");
    if (!hhRes.rows || hhRes.rows.length === 0) {
      throw new Error("No active household case found.");
    }
    const householdRow = hhRes.rows[0] as unknown as { id: string };
    const householdId = householdRow.id;
    const evId = `ev-${Date.now()}`;
    const timestamp = Date.now();

    await db.execute(`INSERT INTO events (id, household_id, timestamp, type, description) VALUES ('${evId}', '${householdId}', ${timestamp}, '${type}', '${description}');`);
    const state = await getCaseState();
    return { success: true, event: { id: evId, timestamp, type, description }, case: state };
  },
});

export const updateEvidenceAction = defineAction({
  title: "Update SNAP Claim Evidence",
  description: "Update SNAP claim requirement verification status.",
  schema: z.object({
    requirement: z.enum(["householdMembersId", "residenceProof", "incomeProof", "householdComposition", "deadlinesNote"]),
    verified: z.boolean(),
  }),
  run: async ({ requirement, verified }) => {
    await ensureDb();
    const db = getDbExec();
    const hhRes = await db.execute("SELECT id FROM households LIMIT 1;");
    if (!hhRes.rows || hhRes.rows.length === 0) {
      throw new Error("No active household case found.");
    }
    const householdRow = hhRes.rows[0] as unknown as { id: string };
    const householdId = householdRow.id;
    const verifiedInt = verified ? 1 : 0;

    await db.execute(`INSERT OR REPLACE INTO claim_requirements (id, household_id, requirement, verified) VALUES ('req-${requirement}-${householdId}', '${householdId}', '${requirement}', ${verifiedInt});`);

    const evId = `ev-${Date.now()}`;
    const timestamp = Date.now();
    const desc = `SNAP requirement '${requirement}' marked as ${verified ? "verified" : "unverified"}.`;
    await db.execute(`INSERT INTO events (id, household_id, timestamp, type, description) VALUES ('${evId}', '${householdId}', ${timestamp}, 'EVIDENCE_UPDATED', '${desc}');`);

    const state = await getCaseState();
    return { success: true, case: state };
  },
});

export const updateStepStatusAction = defineAction({
  title: "Update Step Status",
  description: "Update the status of a crisis outreach step (waiting, calling, confirmed, declined).",
  schema: z.object({
    stepId: z.string(),
    status: z.enum(["waiting", "calling", "confirmed", "declined"]),
  }),
  run: async ({ stepId, status }) => {
    await ensureDb();
    const db = getDbExec();
    await db.execute(`UPDATE steps SET status = '${status}' WHERE id = '${stepId}';`);

    const hhRes = await db.execute("SELECT id FROM households LIMIT 1;");
    const householdRow = hhRes.rows && hhRes.rows.length > 0 ? (hhRes.rows[0] as unknown as { id: string }) : null;
    const householdId = householdRow ? householdRow.id : "unknown";

    const evId = `ev-${Date.now()}`;
    const timestamp = Date.now();
    const desc = `Step ${stepId} status changed to '${status}'.`;
    await db.execute(`INSERT INTO events (id, household_id, timestamp, type, description) VALUES ('${evId}', '${householdId}', ${timestamp}, 'STEP_STATUS_CHANGED', '${desc}');`);

    const state = await getCaseState();
    return { success: true, case: state };
  },
});
