import { getDbExec } from "@agent-native/core/db";
import { beforeAll, expect, it } from "vitest";
import { migrations } from "../../server/db/migrations";
import { loadCase } from "../../server/lib/case";
import callTurn from "../call-turn";
import createCase from "../create-case";
import finishCall from "../finish-call";
import placeCall from "../place-call";

// No model is mocked and no key exists: the scripted call must run with neither.

beforeAll(async () => {
  for (const { sql } of migrations) {
    for (const statement of (typeof sql === "string" ? sql : (sql.postgres ?? "")).split(";").filter((s) => s.trim())) await getDbExec().execute(statement);
  }
  await createCase.run({ location: "Harlem", childrenAges: [2, 2], needs: ["bed"], language: "English" });
});

it("runs a whole call across two screens, with the case following it live", async () => {
  const step = (await loadCase())!.steps[0]!;
  await placeCall.run({ stepId: step.id, resourceId: "dhs-path" });
  const callId = (await loadCase())!.activeCall!.id;
  expect((await loadCase())!.activeCall).toMatchObject({ status: "ringing", turns: [] });

  // The staff line answers; the case screen sees the caller's first words at once.
  const first = await callTurn.run({ callId, turns: [] });
  expect(first).toMatchObject({ endCall: false });
  expect((await loadCase())!.activeCall).toMatchObject({ status: "live", turns: [{ who: "agent" }] });

  // Staff reply; the case screen sees their words and the caller's next line.
  const turns = [{ who: "agent" as const, text: "say" in first ? first.say : "" }, { who: "shelter" as const, text: "Yes, we have a family room." }];
  await callTurn.run({ callId, turns });
  expect((await loadCase())!.activeCall!.turns.map((t) => t.who)).toEqual(["agent", "shelter", "agent"]);

  const done = await finishCall.run({
    callId,
    turns: [...turns, { who: "agent", text: "Where?" }, { who: "shelter", text: "Come before nine. Bring ID." }, { who: "agent", text: "Goodbye." }],
  });
  expect("outcome" in done && done.outcome.result).toBe("confirmed");

  const record = await loadCase();
  expect(record?.activeCall).toBeNull();
  expect(record?.steps[0]?.status).toBe("confirmed");
  expect(record?.evidenceLinks.residenceProof).toBeDefined();
  expect(record?.events.map((e) => e.type)).toEqual(expect.arrayContaining(["CALL_PLACED", "CALL_COMPLETED", "EVIDENCE_LINKED"]));
});
