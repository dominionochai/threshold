import type { ClaimEvidence, ClaimGap, ClaimEvidenceKey } from "./types";

const REQUIREMENTS: ReadonlyArray<{
  requirement: ClaimEvidenceKey;
  description: string;
}> = [
  { requirement: "householdMembersId", description: "ID for all household members is missing." },
  { requirement: "residenceProof", description: "Proof of residence or shelter status is missing." },
  { requirement: "incomeProof", description: "Income documentation is missing." },
  { requirement: "householdComposition", description: "Household composition details are missing." },
  { requirement: "deadlinesNote", description: "Deadlines acknowledgment (10-day documents, 7-day interview, 30-day determination) is missing." }
];

/** False and unknown evidence are both reported as gaps. */
export function findClaimGaps(evidence: ClaimEvidence = {}): ClaimGap[] {
  return REQUIREMENTS.filter(({ requirement }) => evidence[requirement] !== true).map(
    ({ requirement, description }) => ({ requirement, description })
  );
}
