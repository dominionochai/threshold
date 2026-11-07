import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { callerPrompt, lineSchema, turnSchema } from "../shared/engine/call.js";
import { loadOpenCall } from "../server/lib/case.js";
import { attempt, generateJson } from "../server/lib/gemini.js";

export default defineAction({
  description: "The caller's next words in an open call, given what the other end has said so far. Used by the phone on the case screen.",
  schema: z.object({ callId: z.string(), turns: z.array(turnSchema).max(60) }),
  agentTool: false,
  run: async ({ callId, turns }) => {
    const { resource, household, step } = await loadOpenCall(callId);
    return attempt(() => generateJson(callerPrompt(household, resource, step.need), turns, lineSchema));
  },
});
