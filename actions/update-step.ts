import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../server/db/index.js";
import { appendEvent, currentHouseholdId } from "../server/lib/case.js";
import { STEP_STATUSES } from "../shared/engine/types.js";

export default defineAction({
  description: "Set a step's status (waiting, calling, confirmed, declined), optionally recording which place it concerns, and log the change.",
  schema: z.object({ stepId: z.string(), status: z.enum(STEP_STATUSES), resourceId: z.string().optional() }),
  run: async ({ stepId, status, resourceId }) => {
    const householdId = await currentHouseholdId();
    const updated = await getDb()
      .update(schema.steps)
      .set({ status, ...(resourceId && { resourceId }) })
      .where(and(eq(schema.steps.id, stepId), eq(schema.steps.householdId, householdId)))
      .returning({ id: schema.steps.id });
    if (updated.length === 0) throw new Error(`Unknown step: ${stepId}`);
    await appendEvent(householdId, "STEP_STATUS_CHANGED", `Step ${stepId} is now '${status}'.`);
    return { stepId, status };
  },
});
