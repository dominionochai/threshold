import { beforeAll, expect, it } from "vitest";
import { createCaseAction, getCaseState, logEventAction, updateEvidenceAction, updateStepStatusAction } from "../case-actions";

const ctx = { caller: "test" } as never;
const hostile = "it's a trap'); DROP TABLE events;--";

beforeAll(async () => {
  await createCaseAction.run({ location: "Queens", childrenAges: [4, 9], language: "English" }, ctx);
});

it("stores hostile text verbatim and keeps the events table", async () => {
  await logEventAction.run({ type: "TEST", description: hostile }, ctx);
  const state = await getCaseState();
  expect(state?.events.map((e) => e.description)).toContain(hostile);
});

it("upserts evidence and trails each change", async () => {
  const count = async () => (await getCaseState())!.events.filter((e) => e.type === "EVIDENCE_UPDATED").length;
  const before = await count();
  await updateEvidenceAction.run({ requirement: "incomeProof", verified: true }, ctx);
  await updateEvidenceAction.run({ requirement: "incomeProof", verified: false }, ctx);
  const state = await getCaseState();
  expect(state?.evidence.incomeProof).toBe(false);
  expect(await count()).toBe(before + 2);
});

it("updates a step and rejects unknown ids", async () => {
  const stepId = (await getCaseState())!.steps[0].id;
  await updateStepStatusAction.run({ stepId, status: "calling" }, ctx);
  expect((await getCaseState())!.steps.find((s) => s.id === stepId)?.status).toBe("calling");
  await expect(updateStepStatusAction.run({ stepId: "nope", status: "calling" }, ctx)).rejects.toThrow();
});
