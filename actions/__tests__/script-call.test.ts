import { getDbExec } from "@agent-native/core/db";
import { beforeAll, expect, it } from "vitest";
import { linkEvidence } from "../../shared/engine/evidence";
import { migrations } from "../../server/db/migrations";
import { loadCase } from "../../server/lib/case";
import callTurn from "../call-turn";
import createCase from "../create-case";
import decideApproval from "../decide-approval";
import finishCall from "../finish-call";
import requestCall from "../request-call";

// No model is mocked and no key exists: the scripted call must run with neither.

beforeAll(async () => {
  for (const { sql } of migrations) {
    for (const statement of (typeof sql === "string" ? sql : (sql.postgres ?? "")).split(";").filter((s) => s.trim())) await getDbExec().execute(statement);
  }
  await createCase.run({ location: "Harlem", childrenAges: [2, 2], needs: ["bed"], language: "English" });
});

it("approving a call rings the staff phone, and the staff line completes it into the case", async () => {
  const step = (await loadCase())!.steps[0]!;
  const { approvalId } = await requestCall.run({ stepId: step.id, resourceId: "dhs-path" });
  expect((await loadCase())!.activeCall).toBeNull(); // drafted only: nothing rings before a yes

  await decideApproval.run({ approvalId, decision: "approve" });
  let record = (await loadCase())!;
  expect(record.activeCall).toMatchObject({ status: "ringing", turns: [] });
  expect(record.steps[0]?.status).toBe("calling");

  // The staff line answers; the parent's screen sees each side as it speaks.
  const callId = record.activeCall!.id;
  const first = await callTurn.run({ callId, turns: [] });
  expect((await loadCase())!.activeCall).toMatchObject({ status: "live", turns: [{ who: "agent" }] });
  const turns = [{ who: "agent" as const, text: "say" in first ? first.say : "" }, { who: "shelter" as const, text: "Yes, we have a family room." }];
  await callTurn.run({ callId, turns });
  expect((await loadCase())!.activeCall!.turns.map((t) => t.who)).toEqual(["agent", "shelter", "agent"]);

  const done = await finishCall.run({
    callId,
    turns: [...turns, { who: "agent", text: "Where?" }, { who: "shelter", text: "Come before nine. Bring ID." }, { who: "agent", text: "Goodbye." }],
  });
  expect("outcome" in done && done.outcome.result).toBe("confirmed");

  record = (await loadCase())!;
  expect(record.activeCall).toBeNull();
  expect(record.steps[0]?.status).toBe("confirmed");
  expect(record.approvals[0]).toMatchObject({ status: "approved", outcome: "confirmed" });
  expect(record.approvals[0]?.transcript?.map((l) => l.speaker)).toEqual(["assistant", "facility", "assistant", "facility", "assistant"]);
  expect(record.events.map((e) => e.type)).toEqual(expect.arrayContaining(["CALL_PLACED", "CALL_CONFIRMED_BED"]));

  // The two-clocks link: tonight's confirmed bed now backs the SNAP residence requirement.
  expect(linkEvidence(record.events, record.evidence).find((l) => l.requirement === "residenceProof")?.state).toBe("backed");
});
