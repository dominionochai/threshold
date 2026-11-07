import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useEffect, useState } from "react";
import { findClaimGaps } from "@shared/engine/claim";
import { CLAIM_REQUIREMENTS, STEP_STATUSES, type ActiveCall, type CaseRecord, type ClaimEvidenceKey } from "@shared/engine/types";
import { Phone } from "./Phone";
import { PhoneBoundary } from "./PhoneBoundary";
import { ScoutList } from "./ScoutList";

const panel = "rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3";
const heading = "text-sm font-semibold uppercase tracking-wide text-zinc-400";

const CLAIM_LABEL: Record<ClaimEvidenceKey, string> = {
  householdMembersId: "ID for everyone in the household",
  residenceProof: "Proof of residence or shelter status",
  incomeProof: "Income documents",
  householdComposition: "Who lives in the household",
  deadlinesNote: "Deadlines understood (10, 7 and 30 days)",
};

export function CaseView({ record }: { record: CaseRecord }) {
  const { data: scout } = useActionQuery("rank-resources", {});
  const updateStep = useActionMutation("update-step");
  const updateEvidence = useActionMutation("update-evidence");
  const gaps = findClaimGaps(record.evidence);

  // Keep the phone open after the call closes, so the outcome can be read before dismissing it.
  const [phoneCall, setPhoneCall] = useState<ActiveCall | null>(record.activeCall);
  useEffect(() => {
    if (record.activeCall) setPhoneCall(record.activeCall);
  }, [record.activeCall]);

  const timeOf = (eventId: string) => {
    const event = record.events.find((e) => e.id === eventId);
    return event ? new Date(event.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  };

  return (
    <main className="mx-auto min-h-full max-w-2xl space-y-4 bg-zinc-950 p-4 text-zinc-100">
      {phoneCall && (
        <PhoneBoundary key={phoneCall.id} onClose={() => setPhoneCall(null)}>
          <Phone call={phoneCall} location={record.location} onClose={() => setPhoneCall(null)} />
        </PhoneBoundary>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{record.location}</h1>
        <p className="text-xs text-zinc-400">
          <span className="text-amber-400">Tonight</span> → SNAP claim · {gaps.length} gaps
        </p>
      </header>

      <section className={panel}>
        <h2 className={heading}>Tonight</h2>
        {record.steps.map((step) => (
          <div key={step.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{step.need}</span>
              <div className="flex gap-1">
                {STEP_STATUSES.map((status) => (
                  <button
                    key={status}
                    className={`rounded px-2 py-1 text-xs ${step.status === status ? "bg-amber-400 text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}
                    onClick={() => updateStep.mutate({ stepId: step.id, status })}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            {step.status === "declined" && (
              <p className="text-sm text-amber-200">Declined. If nothing else below works, call 311 and ask for family shelter placement tonight.</p>
            )}
            <ScoutList plan={scout?.[step.need]} step={step} record={record} />
          </div>
        ))}
      </section>

      <section className={panel}>
        <h2 className={heading}>SNAP claim: what is still missing</h2>
        {CLAIM_REQUIREMENTS.map((requirement) => {
          const verified = record.evidence[requirement] === true;
          const link = record.evidenceLinks[requirement];
          return (
            <button
              key={requirement}
              className="flex w-full justify-between gap-4 text-left text-sm"
              onClick={() => updateEvidence.mutate({ requirement, verified: !verified })}
            >
              <span className={verified ? "text-zinc-500 line-through" : ""}>{CLAIM_LABEL[requirement]}</span>
              {verified ? (
                <span className="text-emerald-400">verified</span>
              ) : link ? (
                <span className="text-right text-amber-300">stated on a call at {timeOf(link)} · document still needed</span>
              ) : (
                <span className="text-amber-400">missing</span>
              )}
            </button>
          );
        })}
      </section>

      <section className={panel}>
        <h2 className={heading}>Activity trail</h2>
        {record.events.map((event) => (
          <p key={event.id} className="font-mono text-xs text-zinc-300">
            <span className="text-zinc-500">{new Date(event.timestamp).toLocaleTimeString()}</span> {event.type} {event.description}
          </p>
        ))}
      </section>
    </main>
  );
}
