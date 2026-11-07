import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { findNeighborhood, NEIGHBORHOODS } from "../shared/data/neighborhoods.js";
import { orderSteps } from "../shared/engine/escalate.js";
import { NEEDS } from "../shared/engine/types.js";
import { getDb, schema } from "../server/db/index.js";
import { appendEvent } from "../server/lib/case.js";

export default defineAction({
  description: "Open a household case from the intake taps: neighborhood, children's ages, and what they need tonight. Seeds one step per need, most urgent first.",
  schema: z.object({
    location: z.string().refine((name) => findNeighborhood(name), `Pick one of: ${NEIGHBORHOODS.map((n) => n.name).join(", ")}`),
    childrenAges: z.array(z.number().int().min(0).max(17)),
    needs: z.array(z.enum(NEEDS)).min(1),
    language: z.string().default("English"),
  }),
  run: async ({ location, childrenAges, needs, language }) => {
    const db = getDb();
    const id = `case-${crypto.randomUUID()}`;
    const plan = orderSteps(needs);

    await db.insert(schema.households).values({ id, children: childrenAges, location, language, createdAt: Date.now() });
    await db.insert(schema.needs).values(plan.map((p) => ({ id: `need-${p.need}-${id}`, householdId: id, need: p.need, priority: p.priority })));
    await db.insert(schema.steps).values(plan.map((p) => ({ id: `step-${p.need}-${id}`, householdId: id, need: p.need, status: "waiting" })));
    await appendEvent(id, "CASE_OPENED", `Case opened in ${location} for ${childrenAges.length} children. Needs tonight: ${plan.map((p) => p.need).join(", ")}.`);
    return { householdId: id };
  },
});
