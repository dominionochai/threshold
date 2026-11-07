import { getDbExec } from "@agent-native/core/db";
import { beforeAll, expect, it } from "vitest";
import { migrations } from "../../server/db/migrations";
import { loadCase } from "../../server/lib/case";
import createCase from "../create-case";
import logEvent from "../log-event";
import rankResources from "../rank-resources";
import { linkEvidence } from "../../shared/engine/evidence";
import decideApproval from "../decide-approval";
import requestCall from "../request-call";
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
  expect(record?.events.map((e) => e.type)).toContain("CASE_OPENED");
  expect(record?.events.filter((e) => e.type === "SCOUT_FOUND")).toHaveLength(2);
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

it("never calls without a yes, then writes the outcome to the trail and backs the claim", async () => {
  const bed = (await loadCase())!.steps.find((s) => s.need === "bed")!;
  const { approvalId } = await requestCall.run({ stepId: bed.id, resourceId: "dhs-path" });
  let record = (await loadCase())!;
  expect(record.approvals.find((a) => a.id === approvalId)?.status).toBe("pending");
  expect(record.events.some((e) => e.type.startsWith("CALL_"))).toBe(false);
  await expect(requestCall.run({ stepId: bed.id, resourceId: "dhs-path" })).rejects.toThrow(/already waiting/);

  await decideApproval.run({ approvalId, decision: "approve", script: ["Hello, this is an assistant.", "Are you open?"], demoOutcome: "accepts" });
  record = (await loadCase())!;
  const approval = record.approvals.find((a) => a.id === approvalId)!;
  expect(approval.script).toEqual(["Hello, this is an assistant.", "Are you open?"]);
  expect(approval.outcome).toBe("confirmed");
  expect(record.steps.find((s) => s.id === bed.id)?.status).toBe("confirmed");
  expect(linkEvidence(record.events, record.evidence).find((l) => l.requirement === "residenceProof")?.state).toBe("backed");
  await expect(decideApproval.run({ approvalId, decision: "approve" })).rejects.toThrow(/already been decided/);
});

it("stands a call down on 'not now' without sending anything", async () => {
  const food = (await loadCase())!.steps.find((s) => s.need === "food")!;
  const { approvalId } = await requestCall.run({ stepId: food.id, resourceId: "pots-bronx" });
  await decideApproval.run({ approvalId, decision: "decline" });
  const record = (await loadCase())!;
  expect(record.approvals.find((a) => a.id === approvalId)?.status).toBe("declined");
  expect(record.events.some((e) => e.type === "APPROVAL_DECLINED")).toBe(true);
  expect(record.events.some((e) => e.type === "CALL_CONFIRMED_FOOD" || e.type === "CALL_DECLINED_FOOD")).toBe(false);
});

it("after a declined bed, either drafts the next call for approval or says to call 311", async () => {
  const bed = (await loadCase())!.steps.find((s) => s.need === "bed")!;
  const { approvalId } = await requestCall.run({ stepId: bed.id, resourceId: "dhs-path" });
  await decideApproval.run({ approvalId, decision: "approve", demoOutcome: "declines" });
  const record = (await loadCase())!;
  expect(record.steps.find((s) => s.id === bed.id)?.status).toBe("declined");
  expect(record.events.some((e) => e.type === "HELP_311" || e.type === "PATHFINDER_NEXT")).toBe(true);
});
