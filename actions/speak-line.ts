import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { attempt, synthesize } from "../server/lib/gemini.js";

export default defineAction({
  description: "Turn one line of the caller's words into spoken audio (base64 WAV). Used by the phone on the case screen.",
  schema: z.object({ text: z.string().min(1).max(600) }),
  agentTool: false,
  run: ({ text }) => attempt(async () => ({ audio: await synthesize(text) })),
});
