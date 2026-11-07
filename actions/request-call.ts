import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { loadCase } from "../server/lib/case.js";
import { draftApproval } from "../server/lib/call-loop.js";

export default defineAction({
  description:
    "Caller: draft a call to one place Scout returned for a step. This only drafts it and parks it for the parent's approval. Nothing is called or sent until decide-approval is run with approve.",
  schema: z.object({ stepId: z.string(), resourceId: z.string() }),
  run: async ({ stepId, resourceId }) => {
    const record = await loadCase();
    if (!record) throw new Error("No case is open. Create one first.");
    return { approvalId: await draftApproval(record, stepId, resourceId) };
  },
});
