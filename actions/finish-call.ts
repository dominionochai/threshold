import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { clerkPrompt, NO_ANSWER, outcomeFromStaff, outcomeSchema, transcriptText, turnSchema } from "../shared/engine/conversation.js";
import { getDb, schema } from "../server/db/index.js";
import { recordCallResult } from "../server/lib/call-loop.js";
import { isScripted } from "../server/lib/call-mode.js";
import { loadOpenCall } from "../server/lib/case.js";
import { attempt, generateJson } from "../server/lib/gemini.js";

export default defineAction({
  description: "Close an open call from its transcript: read the outcome, then update the approval, the step and the activity trail. Used by the staff line.",
  schema: z.object({ callId: z.string(), turns: z.array(turnSchema).max(60) }),
  agentTool: false,
  run: async ({ callId, turns }) => {
    const { call, resource, household, step } = await loadOpenCall(callId);
    const db = getDb();
    // Save the transcript and close the call first, so a failed read of the outcome never loses the call.
    await db.update(schema.calls).set({ status: "completed", transcript: turns }).where(eq(schema.calls.id, callId));

    const heard = turns.some((t) => t.who === "shelter");
    const read = !heard ? NO_ANSWER : isScripted() ? outcomeFromStaff(turns, resource.name) : await attempt(() => generateJson(clerkPrompt(resource), [{ who: "shelter", text: transcriptText(turns) }], outcomeSchema));
    if ("error" in read) return read;

    await db.update(schema.calls).set({ outcome: read }).where(eq(schema.calls.id, callId));
    await recordCallResult(household, call, resource, step, read, turns);
    return { outcome: read };
  },
});
