import { getDbExec } from "@agent-native/core/db";
import { beforeAll, expect, it } from "vitest";
import { migrations } from "../../server/db/migrations";
import { loadCase } from "../../server/lib/case";
import createCase from "../create-case";
import logEvent from "../log-event";
import rankResources from "../rank-resources";
import updateEvidence from "../update-evidence";
import updateStep from "../update-step";

const hostile = "it's a trap'); DROP TABLE events;--";

beforeAll(async () => {
  for (const { sql } of migrations) {
    for (const statement of (typeof sql === "string" ? sql : (sql.postgres ?? "")).split(";").filter((s) => s.trim())) await getDbExec().execute(statement);
  }
  await createCase.run({ location: "Mott Haven", childrenAges: [4, 9], needs: ["food", "bed"], language: "English" });
});

it("opens a case with steps ordered by urgency and a CASE_OPENED event", async () => {
  const record = await loadCase();
  expect(record?.needs).toEqual(["bed", "food"]);
  expect(record?.steps.every((s) => s.status === "waiting")).toBe(true);
  expect(record?.events.map((e) => e.type)).toEqual(["CASE_OPENED"]);
});

it("stores hostile text verbatim and keeps the table", async () => {
  await logEvent.run({ type: "NOTE", description: hostile });
  expect((await loadCase())?.events.map((e) => e.description)).toContain(hostile);
});

it("upserts evidence and updates a step, trailing each change", async () => {
  await updateEvidence.run({ requirement: "incomeProof", verified: true });
  await updateEvidence.run({ requirement: "incomeProof", verified: false });
  const stepId = (await loadCase())!.steps[0]!.id;
  await updateStep.run({ stepId, status: "calling" });
  await expect(updateStep.run({ stepId: "nope", status: "calling" })).rejects.toThrow();
  const record = await loadCase();
  expect(record?.evidence.incomeProof).toBe(false);
  expect(record?.steps.find((s) => s.id === stepId)?.status).toBe("calling");
  expect(record?.events.filter((e) => e.type === "EVIDENCE_UPDATED")).toHaveLength(2);
});

it("ranks per need without throwing on an empty dataset", async () => {
  expect(Object.keys(await rankResources.run({}))).toEqual(["bed", "food"]);
});
