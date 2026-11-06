import { defineAction } from "@agent-native/core";
import { z } from "zod";
import type { CaseRecord } from "../engine/types";

let currentCase: CaseRecord = {
  id: "case-nyc-01",
  children: [6, 10],
  needs: ["bed", "food", "medical"],
  location: "Brooklyn",
  language: "English",
  evidence: {},
  steps: [
    { id: "step-1", need: "bed", status: "waiting", resourceId: "nyc-shelter-brooklyn-1" },
    { id: "step-2", need: "food", status: "waiting", resourceId: "nyc-food-pantry-manhattan-1" },
    { id: "step-3", need: "medical", status: "waiting", resourceId: "nyc-health-queens-1" }
  ],
  events: [
    {
      id: "ev-1",
      timestamp: Date.now() - 3600000,
      type: "CASE_INITIALIZED",
      description: "Case opened for Brooklyn household with 2 children. Two-threshold tracking initiated."
    }
  ],
  simulated: true
};

export function getCaseState(): CaseRecord {
  return currentCase;
}

export const logEventAction = defineAction({
  title: "Log Event",
  description: "Log an event to the activity trail ledger (claim evidence trail).",
  schema: z.object({
    type: z.string(),
    description: z.string(),
  }),
  run: async ({ type, description }) => {
    const newEvent = {
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      type,
      description,
    };
    currentCase.events = [newEvent, ...currentCase.events];
    return { success: true, event: newEvent, case: currentCase };
  }
});

export const updateEvidenceAction = defineAction({
  title: "Update SNAP Claim Evidence",
  description: "Update SNAP claim requirement verification status.",
  schema: z.object({
    requirement: z.enum(["householdMembersId", "residenceProof", "incomeProof", "householdComposition", "deadlinesNote"]),
    verified: z.boolean(),
  }),
  run: async ({ requirement, verified }) => {
    currentCase.evidence = {
      ...currentCase.evidence,
      [requirement]: verified,
    };
    const newEvent = {
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      type: "EVIDENCE_UPDATED",
      description: `SNAP claim requirement '${requirement}' marked as ${verified ? "verified" : "unverified"}.`,
    };
    currentCase.events = [newEvent, ...currentCase.events];
    return { success: true, case: currentCase };
  }
});

export const updateStepStatusAction = defineAction({
  title: "Update Step Status",
  description: "Update the status of a crisis outreach step (waiting, calling, confirmed, declined).",
  schema: z.object({
    stepId: z.string(),
    status: z.enum(["waiting", "calling", "confirmed", "declined"]),
  }),
  run: async ({ stepId, status }) => {
    currentCase.steps = currentCase.steps.map(s => s.id === stepId ? { ...s, status } : s);
    const newEvent = {
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      type: "STEP_STATUS_CHANGED",
      description: `Step ${stepId} status changed to '${status}'.`,
    };
    currentCase.events = [newEvent, ...currentCase.events];
    return { success: true, case: currentCase };
  }
});
