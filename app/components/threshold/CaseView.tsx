import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { findClaimGaps } from "@shared/engine/claim";
import { CLAIM_REQUIREMENTS, STEP_STATUSES, type CaseRecord } from "@shared/engine/types";
import { ScoutList } from "./ScoutList";

const panel = "rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3";
const heading = "text-sm font-semibold uppercase tracking-wide text-zinc-400";

export function CaseView({ record }: { record: CaseRecord }) {
  const { data: scout } = useActionQuery("rank-resources", {});
  const updateStep = useActionMutation("update-step");
  const updateEvidence = useActionMutation("update-evidence");
  const gaps = findClaimGaps(record.evidence);

  return (
    <main className="mx-auto min-h-full max-w-2xl space-y-4 bg-zinc-950 p-4 text-zinc-100">
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
            <ScoutList plan={scout?.[step.need]} />
          </div>
        ))}
      </section>

      <section className={panel}>
        <h2 className={heading}>SNAP claim: what is still missing</h2>
        {CLAIM_REQUIREMENTS.map((requirement) => {
          const verified = record.evidence[requirement] === true;
          return (
            <button
              key={requirement}
              className="flex w-full justify-between text-left text-sm"
              onClick={() => updateEvidence.mutate({ requirement, verified: !verified })}
            >
              <span className={verified ? "text-zinc-500 line-through" : ""}>{requirement}</span>
              <span className={verified ? "text-emerald-400" : "text-amber-400"}>{verified ? "verified" : "missing"}</span>
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
