import { getDbExec } from "@agent-native/core/db";
import { beforeAll, expect, it, vi } from "vitest";
import { migrations } from "../../server/db/migrations";
import { loadCase } from "../../server/lib/case";
import * as gemini from "../../server/lib/gemini";
import callTurn from "../call-turn";
import createCase from "../create-case";
import decideApproval from "../decide-approval";
import finishCall from "../finish-call";
import requestCall from "../request-call";

vi.mock("../../server/lib/gemini", async (original) => ({ ...(await original<typeof gemini>()), generateJson: vi.fn(), synthesize: vi.fn() }));
const generateJson = vi.mocked(gemini.generateJson);
vi.stubEnv("THRESHOLD_CALL_MODE", "live");

beforeAll(async () => {
  for (const { sql } of migrations) {
    for (const statement of (typeof sql === "string" ? sql : (sql.postgres ?? "")).split(";").filter((s) => s.trim())) await getDbExec().execute(statement);
  }
  await createCase.run({ location: "Mott Haven", childrenAges: [2, 2], needs: ["bed"], language: "English" });
  const step = (await loadCase())!.steps[0]!;
  const { approvalId } = await requestCall.run({ stepId: step.id, resourceId: "dhs-path" });
  await decideApproval.run({ approvalId, decision: "approve" });
});

it("only drafts calls to places that serve the step's need", async () => {
  const step = (await loadCase())!.steps[0]!;
  await expect(requestCall.run({ stepId: step.id, resourceId: "lincoln-ed" })).rejects.toThrow(/does not help/);
});

it("asks the model for the caller's next words in live mode", async () => {
  generateJson.mockResolvedValueOnce({ say: "Hello, I'm an assistant calling for a family.", endCall: false });
  const line = await callTurn.run({ callId: (await loadCase())!.activeCall!.id, turns: [] });
  expect("say" in line && line.say).toContain("assistant");
});

it("reports a model failure in words instead of a blank server error", async () => {
  generateJson.mockRejectedValueOnce(new Error("Gemini gemini-flash-latest failed (404): model not found"));
  const result = await callTurn.run({ callId: (await loadCase())!.activeCall!.id, turns: [] });
  expect(result).toEqual({ error: "Gemini gemini-flash-latest failed (404): model not found" });
});

it("closes a call nobody spoke on as unanswered, without asking the model", async () => {
  generateJson.mockClear();
  const callId = (await loadCase())!.activeCall!.id;
  const done = await finishCall.run({ callId, turns: [{ who: "agent", text: "Hello?" }] });
  expect("outcome" in done && done.outcome.result).toBe("unclear");
  expect(generateJson).not.toHaveBeenCalled();
  const record = (await loadCase())!;
  expect(record.steps[0]?.status).toBe("waiting");
  expect(record.events.map((e) => e.type)).toContain("CALL_UNCLEAR");
});
