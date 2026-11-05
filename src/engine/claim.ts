import type { ClaimEvidence, ClaimGap, ClaimEvidenceKey } from "./types";

const REQUIREMENTS: ReadonlyArray<{
  requirement: ClaimEvidenceKey;
  description: string;
}> = [
  { requirement: "mealRecords", description: "Explicit meal records are missing." },
  { requirement: "attendanceDays", description: "Attendance days are missing." },
  { requirement: "allergyDeclarations", description: "Allergy declarations are missing." },
  { requirement: "idDocuments", description: "ID documents are missing." }
];

/** False and unknown evidence are both reported as gaps. */
export function findClaimGaps(evidence: ClaimEvidence = {}): ClaimGap[] {
  return REQUIREMENTS.filter(({ requirement }) => evidence[requirement] !== true).map(
    ({ requirement, description }) => ({ requirement, description })
  );
}
