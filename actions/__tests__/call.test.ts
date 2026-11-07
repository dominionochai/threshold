import { getDbExec } from "@agent-native/core/db";
import { beforeAll, expect, it, vi } from "vitest";
import { migrations } from "../../server/db/migrations";
import { loadCase } from "../../server/lib/case";
import * as gemini from "../../server/lib/gemini";
import callTurn from "../call-turn";
import createCase from "../create-case";
import finishCall from "../finish-call";
import placeCall from "../place-call";

vi.mock("../../server/lib/gemini");
const generateJson = vi.mocked(gemini.generateJson);

const talk = [
  { who: "agent", text: "Hi, I'm an assistant calling for a family." },
  { who: "shelter", text: "Yes, bring them in tonight before nine. Bring ID." },
] as const;

beforeAll(async () => {
  for (const { sql } of migrations) {
    for (const statement of (typeof sql === "string" ? sql : (sql.postgres ?? "")).split(";").filter((s) => s.trim())) await getDbExec().execute(statement);
  }
  await createCase.run({ location: "Mott Haven", childrenAges: [2, 2], needs: ["bed"], language: "English" });
});

it("refuses a call to a place that does not serve the step's need", async () => {
  const step = (await loadCase())!.steps[0]!;
  await expect(placeCall.run({ stepId: step.id, resourceId: "lincoln-ed" })).rejects.toThrow(/does not serve/);
});

it("places a call: the step is calling, the phone is ringing, the trail says so", async () => {
  const step = (await loadCase())!.steps[0]!;
  await placeCall.run({ stepId: step.id, resourceId: "dhs-path" });
  const record = await loadCase();
  expect(record?.activeCall?.resourceName).toContain("PATH");
  expect(record?.steps[0]?.status).toBe("calling");
  expect(record?.events[0]?.type).toBe("CALL_PLACED");
  await expect(placeCall.run({ stepId: step.id, resourceId: "dhs-path" })).rejects.toThrow(/already open/);
});

it("asks the model for the caller's next words", async () => {
  generateJson.mockResolvedValueOnce({ say: "Hello, I'm an assistant calling for a family.", endCall: false });
  const line = await callTurn.run({ callId: (await loadCase())!.activeCall!.id, turns: [] });
  expect(line.say).toContain("assistant");
});

it("finishes a confirmed bed: step confirmed, call logged, evidence linked to the call", async () => {
  const callId = (await loadCase())!.activeCall!.id;
  generateJson.mockResolvedValueOnce({ result: "confirmed", summary: "They can take the family tonight.", instructions: ["Arrive before 9 pm", "Bring ID"], spokeWith: "intake desk" });
  const { linkedRequirement } = await finishCall.run({ callId, turns: [...talk] });

  const record = await loadCase();
  const completed = record!.events.find((e) => e.type === "CALL_COMPLETED");
  expect(linkedRequirement).toBe("residenceProof");
  expect(record?.steps[0]?.status).toBe("confirmed");
  expect(record?.activeCall).toBeNull();
  expect(completed?.description).toContain("Bring ID");
  expect(record?.evidenceLinks.residenceProof).toBe(completed?.id);
  expect(record?.evidence.residenceProof).toBe(false);
});

it("treats a call nobody spoke on as unanswered, without asking the model", async () => {
  const step = (await loadCase())!.steps[0]!;
  await placeCall.run({ stepId: step.id, resourceId: "dhs-path" });
  generateJson.mockClear();
  const { outcome } = await finishCall.run({ callId: (await loadCase())!.activeCall!.id, turns: [talk[0]] });
  expect(outcome.result).toBe("unclear");
  expect(generateJson).not.toHaveBeenCalled();
  expect((await loadCase())?.steps[0]?.status).toBe("waiting");
});
