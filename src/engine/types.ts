export const NEEDS = ["food", "bed", "medical", "legal"] as const;
export type Need = (typeof NEEDS)[number];

export const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;
export type NYCBorough = (typeof NYC_BOROUGHS)[number];

export interface Household {
  id: string;
  children: number[];
  needs: Need[];
  location: NYCBorough | string;
  language: string;
  secondaryLanguage?: string;
}

export interface AgeRange {
  minAge: number;
  maxAge: number;
}

export interface Resource {
  id: string;
  name: string;
  kind: string;
  distanceKm: number | null;
  acceptsChildren: boolean | null;
  agesServed: AgeRange[] | null;
  hours: string | null;
  openNow: boolean | null;
  phone: string | null;
  address: string | null;
  sourceUrl: string;
  verifiedAt: string | null;
  conflictNote?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface PlanStep {
  need: Need;
  priority: number;
  reason: string;
}

export interface Plan {
  id: string;
  householdId: string;
  steps: PlanStep[];
}

export type ClaimEvidenceKey =
  | "householdMembersId"
  | "residenceProof"
  | "incomeProof"
  | "householdComposition"
  | "deadlinesNote";

export type ClaimEvidence = Partial<Record<ClaimEvidenceKey, boolean>>;

export interface ClaimGap {
  requirement: ClaimEvidenceKey;
  description: string;
}

export type StepStatus = "waiting" | "calling" | "confirmed" | "declined";

export interface CaseStep {
  id: string;
  need: Need;
  status: StepStatus;
  resourceId?: string;
}

export interface CaseEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface CaseRecord extends Household {
  evidence: ClaimEvidence;
  steps: CaseStep[];
  events: CaseEvent[];
  simulated: boolean;
}
