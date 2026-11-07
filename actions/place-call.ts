import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../server/db/index.js";
import { appendEvent, loadCase } from "../server/lib/case.js";
import { resources } from "../shared/data/resources.js";

export default defineAction({
  description:
    "Place a phone call to a listed place on the family's behalf. The call shares the children's ages, the neighborhood and the need with that place, so a person must approve it first. Opens the phone on the case screen.",
  schema: z.object({ stepId: z.string(), resourceId: z.string() }),
  needsApproval: true,
  run: async ({ stepId, resourceId }) => {
    const household = await loadCase();
    const step = household?.steps.find((s) => s.id === stepId);
    const resource = resources.find((r) => r.id === resourceId);
    if (!household || !step) throw new Error(`Unknown step: ${stepId}`);
    if (!resource || resource.kind !== step.need) throw new Error(`${resourceId} does not serve the '${step.need}' need.`);
    if (household.activeCall) throw new Error("A call is already open.");

    const callId = `call-${crypto.randomUUID()}`;
    const db = getDb();
    await db.insert(schema.calls).values({ id: callId, householdId: household.id, stepId, resourceId, status: "ringing", transcript: [], startedAt: Date.now() });
    await db.update(schema.steps).set({ status: "calling", resourceId }).where(and(eq(schema.steps.id, stepId), eq(schema.steps.householdId, household.id)));
    await appendEvent(household.id, "CALL_PLACED", `Approved: Threshold is calling ${resource.name} for the ${step.need} step.`);
    return { callId };
  },
});
