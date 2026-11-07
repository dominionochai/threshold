import { callEvent, EVENT } from "./events";
import { CLAIM_REQUIREMENTS, type CaseEvent, type ClaimEvidence, type ClaimEvidenceKey } from "./types";

/**
 * ready: the person confirmed it.
 * backed: tonight's trail already shows it, and the person still decides whether to use it.
 * missing: nothing yet.
 */
export type EvidenceState = "ready" | "backed" | "missing";

export interface EvidenceLink {
  requirement: ClaimEvidenceKey;
  state: EvidenceState;
  /** The logged events that back this requirement, newest first. */
  proof: CaseEvent[];
}

const BACKED_BY: Partial<Record<ClaimEvidenceKey, (event: CaseEvent) => boolean>> = {
  householdComposition: (e) => e.type === EVENT.CASE_OPENED,
  residenceProof: (e) => e.type === callEvent("confirmed", "bed"),
};

/** The two-clocks link: what happened tonight, lined up against what the SNAP claim asks for. Never decides eligibility. */
export function linkEvidence(events: readonly CaseEvent[], evidence: ClaimEvidence = {}): EvidenceLink[] {
  const newestFirst = [...events].sort((a, b) => b.timestamp - a.timestamp);
  return CLAIM_REQUIREMENTS.map((requirement) => {
    const proof = newestFirst.filter(BACKED_BY[requirement] ?? (() => false));
    const state: EvidenceState = evidence[requirement] === true ? "ready" : proof.length > 0 ? "backed" : "missing";
    return { requirement, state, proof };
  });
}
