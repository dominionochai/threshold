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

/** Plain words for each requirement, as shown to the person. */
export const REQUIREMENT_LABEL: Record<ClaimEvidenceKey, { title: string; help: string }> = {
  householdMembersId: { title: "ID for everyone in your household", help: "Any ID you have for each person. Tell the caseworker about anyone who has none." },
  residenceProof: { title: "Where you're staying", help: "Proof of residence or shelter status." },
  incomeProof: { title: "Income, or none", help: "Pay stubs or a note that you have no income right now." },
  householdComposition: { title: "Who lives with you", help: "The adults and children in your household." },
  deadlinesNote: { title: "The deadlines", help: "Documents in 10 days, interview within 7, decision within 30." },
};
