export const NEEDS = ["food", "bed", "medical", "legal"] as const;
export type Need = (typeof NEEDS)[number];

export const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;
export type NYCBorough = (typeof NYC_BOROUGHS)[number];

export const STEP_STATUSES = ["waiting", "calling", "confirmed", "declined"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const CLAIM_REQUIREMENTS = [
  "householdMembersId",
  "residenceProof",
  "incomeProof",
  "householdComposition",
  "deadlinesNote",
] as const;
export type ClaimEvidenceKey = (typeof CLAIM_REQUIREMENTS)[number];
export type ClaimEvidence = Partial<Record<ClaimEvidenceKey, boolean>>;

export interface ClaimGap {
  requirement: ClaimEvidenceKey;
  description: string;
}

export interface Household {
  id: string;
  children: number[];
  needs: Need[];
  /** Neighborhood name, resolved to coordinates through shared/data/neighborhoods. */
  location: string;
  language: string;
}

export interface PlanStep {
  need: Need;
  priority: number;
  reason: string;
}

export interface CaseStep {
  id: string;
  need: Need;
  status: StepStatus;
  resourceId: string | null;
}

export interface CaseEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
}

export const APPROVAL_STATUSES = ["pending", "approved", "declined"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type CallOutcome = "confirmed" | "declined";

export interface TranscriptLine {
  speaker: "assistant" | "facility";
  text: string;
}

/** A drafted outbound call. Nothing is placed until a person approves it. */
export interface Approval {
  id: string;
  stepId: string;
  resourceId: string;
  need: Need;
  script: string[];
  status: ApprovalStatus;
  outcome: CallOutcome | null;
  transcript: TranscriptLine[] | null;
  createdAt: number;
  decidedAt: number | null;
}

export interface CaseRecord extends Household {
  evidence: ClaimEvidence;
  steps: CaseStep[];
  events: CaseEvent[];
  approvals: Approval[];
}

export const NEED_LABEL: Record<Need, string> = {
  food: "Food tonight",
  bed: "A place to sleep",
  medical: "Medical care",
  legal: "Legal help",
};
