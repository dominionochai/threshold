import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { simulateCall } from "../shared/engine/call.js";
import { callEvent, EVENT } from "../shared/engine/events.js";
import { getDb, schema } from "../server/db/index.js";
import { appendEvent, loadCase } from "../server/lib/case.js";
import { afterDecline, findResource, startCall } from "../server/lib/call-loop.js";

const setStep = (stepId: string, householdId: string, status: string, resourceId?: string) =>
  getDb()
    .update(schema.steps)
    .set({ status, ...(resourceId && { resourceId }) })
    .where(and(eq(schema.steps.id, stepId), eq(schema.steps.householdId, householdId)));

export default defineAction({
  description:
    "The parent's decision on a drafted call. 'approve' rings the staff phone; when staff finish the call, the outcome and transcript are written to the activity trail. With `demoOutcome` set, 'approve' instead runs a rehearsed call at once. No real phone call is ever placed. 'decline' stands the call down. Only a person's explicit yes should ever trigger 'approve'. `script` carries any edits they made. `demoOutcome` forces the answer for demos.",
  schema: z.object({
    approvalId: z.string(),
    decision: z.enum(["approve", "decline"]),
    script: z.array(z.string()).optional(),
    demoOutcome: z.enum(["accepts", "declines"]).optional(),
  }),
  run: async ({ approvalId, decision, script, demoOutcome }) => {
    const record = await loadCase();
    if (!record) throw new Error("No case is open. Create one first.");
    const approval = record.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new Error(`Unknown approval: ${approvalId}`);
    if (approval.status !== "pending") throw new Error("This call has already been decided.");
    const resource = findResource(approval.resourceId);
    const db = getDb();
    const decidedAt = Date.now();
    const where = and(eq(schema.approvals.id, approvalId), eq(schema.approvals.householdId, record.id));

    if (decision === "decline") {
      await db.update(schema.approvals).set({ status: "declined", decidedAt }).where(where);
      await appendEvent(record.id, EVENT.APPROVAL_DECLINED, `You said not now to the call to ${resource.name}. Nothing was sent.`);
      return { outcome: null };
    }

    const finalScript = (script ?? approval.script).map((l) => l.trim()).filter(Boolean);
    if (finalScript.length === 0) throw new Error("The call needs at least one line to say.");

    await db.update(schema.approvals).set({ status: "approved", script: finalScript, decidedAt }).where(where);
    await appendEvent(record.id, EVENT.APPROVAL_GRANTED, `You approved the call to ${resource.name}. Caller is starting it now.`);
    await setStep(approval.stepId, record.id, "calling", resource.id);
    if (!demoOutcome) {
      await startCall(record, approval, resource);
      return { outcome: null };
    }

    const at = new Date();
    const result = simulateCall(resource, finalScript, at, demoOutcome);
    await db.update(schema.approvals).set({ outcome: result.outcome, transcript: result.transcript }).where(where);
    await setStep(approval.stepId, record.id, result.outcome, resource.id);

    if (result.outcome === "confirmed") {
      const note = resource.note ? ` ${resource.note}` : "";
      await appendEvent(record.id, callEvent("confirmed", approval.need), `Caller (rehearsed call): ${resource.name} said yes. Go to ${resource.address}.${note}`);
    } else {
      await appendEvent(record.id, callEvent("declined", approval.need), `Caller (rehearsed call): ${resource.name} said no. ${result.reason}`);
      await afterDecline(record, approval.stepId, approval.need, resource.id, at);
    }
    return { outcome: result.outcome };
  },
});
