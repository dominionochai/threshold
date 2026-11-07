import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { loadCase } from "../server/lib/case.js";

export default defineAction({
  description: "Read the open household case: household, needs, steps with status, SNAP evidence and the activity trail. Returns null when no case is open.",
  schema: z.object({}),
  http: { method: "GET" },
  readOnly: true,
  run: loadCase,
});
