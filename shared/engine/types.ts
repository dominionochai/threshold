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

export type Turn = { who: "agent" | "shelter"; text: string };

/** A call that has been placed and not yet closed. Both the case screen and the staff line read this. */
export interface ActiveCall {
  id: string;
  stepId: string;
  resourceId: string;
  resourceName: string;
  status: "ringing" | "live";
  turns: Turn[];
  /** The demo call: pre-recorded caller, staff lines read from the script. */
  scripted: boolean;
}

export interface CaseRecord extends Household {
  evidence: ClaimEvidence;
  /** The call (event) that supports a requirement without yet proving it. */
  evidenceLinks: Partial<Record<ClaimEvidenceKey, string>>;
  activeCall: ActiveCall | null;
  steps: CaseStep[];
  events: CaseEvent[];
}
