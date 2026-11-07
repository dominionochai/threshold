import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { clerkPrompt, evidenceFor, NO_ANSWER, outcomeSchema, stepStatusFor, turnSchema } from "../shared/engine/call.js";
import { getDb, schema } from "../server/db/index.js";
import { appendEvent, loadOpenCall } from "../server/lib/case.js";
import { generateJson } from "../server/lib/gemini.js";

export default defineAction({
  description: "Close an open call from its transcript: read the outcome, set the step's status, and write the call and any claim evidence to the activity trail.",
  schema: z.object({ callId: z.string(), turns: z.array(turnSchema).max(60) }),
  agentTool: false,
  run: async ({ callId, turns }) => {
    const { resource, household, step } = await loadOpenCall(callId);
    const db = getDb();
    // Save the transcript and close the call first, so a failed read of the outcome never loses the call.
    await db.update(schema.calls).set({ status: "completed", transcript: turns }).where(eq(schema.calls.id, callId));

    const heard = turns.some((t) => t.who === "shelter");
    const outcome = heard ? await generateJson(clerkPrompt(resource), turns, outcomeSchema) : NO_ANSWER;
    await db.update(schema.calls).set({ outcome }).where(eq(schema.calls.id, callId));
    await db.update(schema.steps).set({ status: stepStatusFor(outcome) }).where(and(eq(schema.steps.id, step.id), eq(schema.steps.householdId, household.id)));

    const todo = outcome.instructions.length ? ` To do: ${outcome.instructions.join("; ")}.` : "";
    const callEvent = await appendEvent(household.id, "CALL_COMPLETED", `${resource.name}${outcome.spokeWith ? ` (${outcome.spokeWith})` : ""}: ${outcome.summary}${todo}`);

    const requirement = evidenceFor(step.need, outcome);
    if (requirement) {
      await db
        .insert(schema.claimRequirements)
        .values({ id: `req-${requirement}-${household.id}`, householdId: household.id, requirement, verified: false, eventId: callEvent.id })
        .onConflictDoUpdate({ target: schema.claimRequirements.id, set: { eventId: callEvent.id } });
      await appendEvent(household.id, "EVIDENCE_LINKED", `The call with ${resource.name} supports '${requirement}'. Staff stated the family's shelter status; a document is still needed.`);
    }
    return { outcome, linkedRequirement: requirement };
  },
});
