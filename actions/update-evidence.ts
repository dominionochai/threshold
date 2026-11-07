import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, schema } from "../server/db/index.js";
import { appendEvent, currentHouseholdId } from "../server/lib/case.js";
import { REQUIREMENT_LABEL } from "../shared/engine/claim.js";
import { EVENT } from "../shared/engine/events.js";
import { CLAIM_REQUIREMENTS } from "../shared/engine/types.js";

export default defineAction({
  description: "Mark one SNAP claim requirement as verified or not, and record the change in the activity trail.",
  schema: z.object({ requirement: z.enum(CLAIM_REQUIREMENTS), verified: z.boolean() }),
  run: async ({ requirement, verified }) => {
    const householdId = await currentHouseholdId();
    await getDb()
      .insert(schema.claimRequirements)
      .values({ id: `req-${requirement}-${householdId}`, householdId, requirement, verified })
      .onConflictDoUpdate({ target: schema.claimRequirements.id, set: { verified } });
    await appendEvent(householdId, EVENT.EVIDENCE_UPDATED, `Claim clerk: "${REQUIREMENT_LABEL[requirement].title}" is ${verified ? "ready for your SNAP claim" : "back on the list of what's missing"}.`);
    return { requirement, verified };
  },
});
