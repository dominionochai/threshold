export const NEEDS = ["food", "bed", "medical", "legal"] as const;

export type Need = (typeof NEEDS)[number];

export interface Household {
  id: string;
  /** Ages of children in the household, in years. */
  children: number[];
  needs: Need[];
  location: string;
  language: string;
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
  /** Provenance/display flags; directory seed records are explicitly simulated. */
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
  | "mealRecords"
  | "attendanceDays"
  | "allergyDeclarations"
  | "idDocuments";

export type ClaimEvidence = Partial<Record<ClaimEvidenceKey, boolean>>;

export interface ClaimGap {
  requirement: ClaimEvidenceKey;
  description: string;
}

export interface CaseRecord extends Household {
  evidence: ClaimEvidence;
  simulated: boolean;
}
