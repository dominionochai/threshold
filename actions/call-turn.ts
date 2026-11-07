import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { callerPrompt, lineSchema, scriptedLines, scriptedStep, turnSchema } from "../shared/engine/call.js";
import { getDb, schema } from "../server/db/index.js";
import { isScripted } from "../server/lib/call-mode.js";
import { loadOpenCall } from "../server/lib/case.js";
import { attempt, generateJson } from "../server/lib/gemini.js";

export default defineAction({
  description: "The caller's next words in an open call, given what the other end has said so far. Saves the conversation as it happens so every screen can follow it. Used by the staff line.",
  schema: z.object({ callId: z.string(), turns: z.array(turnSchema).max(60) }),
  agentTool: false,
  run: async ({ callId, turns }) => {
    const { resource, household, step } = await loadOpenCall(callId);
    const db = getDb();
    await db.update(schema.calls).set({ status: "live", transcript: turns }).where(eq(schema.calls.id, callId));

    const line = isScripted()
      ? scriptedStep(scriptedLines(household, resource, step.need), turns)
      : await attempt(() => generateJson(callerPrompt(household, resource, step.need), turns, lineSchema));
    if ("error" in line) return line;

    await db.update(schema.calls).set({ transcript: [...turns, { who: "agent", text: line.say }] }).where(eq(schema.calls.id, callId));
    return line;
  },
});
