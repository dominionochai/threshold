import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { findNeighborhood, NEIGHBORHOODS } from "../shared/data/neighborhoods.js";
import { orderSteps } from "../shared/engine/escalate.js";
import { EVENT } from "../shared/engine/events.js";
import { NEED_LABEL, NEEDS } from "../shared/engine/types.js";
import { getDb, schema } from "../server/db/index.js";
import { appendEvent } from "../server/lib/case.js";
import { rankFor } from "../server/lib/call-loop.js";

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
    const kids = childrenAges.length === 0 ? "" : ` for you and ${childrenAges.length} ${childrenAges.length === 1 ? "child" : "children"}`;
    await appendEvent(id, EVENT.CASE_OPENED, `Case opened in ${location}${kids}. Needs tonight: ${plan.map((p) => NEED_LABEL[p.need].toLowerCase()).join(", ")}.`);

    // Scout reports once per need, in plain words, so the parent sees the team working.
    const household = { id, children: childrenAges, needs: plan.map((p) => p.need), location, language };
    const at = new Date();
    for (const { need } of plan) {
      const ranked = rankFor({ ...household, evidence: {}, steps: [], events: [], approvals: [] }, need, at);
      const label = NEED_LABEL[need].toLowerCase();
      const top = ranked[0];
      await appendEvent(
        id,
        EVENT.SCOUT_FOUND,
        top
          ? `Scout found ${ranked.length} sourced ${ranked.length === 1 ? "place" : "places"} for ${label} near ${location}. Best match: ${top.resource.name}. ${top.reasons.join(", ")}.`
          : `Scout has no sourced place for ${label} that fits your family yet. 311 can help tonight.`,
      );
    }
    return { householdId: id };
  },
});
