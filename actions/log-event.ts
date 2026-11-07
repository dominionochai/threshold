import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { appendEvent, currentHouseholdId } from "../server/lib/case.js";

export default defineAction({
  description: "Append a timestamped entry to the activity trail. The trail is also the evidence ledger for the SNAP claim, so record what happened, who said it and when.",
  schema: z.object({
    type: z.string().describe("Short upper-case label, e.g. CALL_OUTCOME or NOTE"),
    description: z.string().min(1),
  }),
  run: async ({ type, description }) => ({ event: await appendEvent(await currentHouseholdId(), type, description) }),
});
