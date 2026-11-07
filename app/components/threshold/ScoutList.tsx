import { useState } from "react";
import type { Edge } from "@shared/engine/pathfinder";
import type { ScoutResult } from "@shared/engine/scout";
import type { CaseRecord, CaseStep } from "@shared/engine/types";
import { CallApproval } from "./CallApproval";

interface Plan {
  options: ScoutResult[];
  ifDeclined: { next: ScoutResult; via: Edge | null } | null;
}

export function ScoutList({ plan, step, record }: { plan: Plan | undefined; step: CaseStep; record: CaseRecord }) {
  const [asking, setAsking] = useState<string | null>(null);
  if (!plan) return null;
  if (plan.options.length === 0) {
    return <p className="text-sm text-zinc-400">No sourced place on file takes this household for this need yet. 311 can place a family tonight.</p>;
  }
  return (
    <div className="space-y-2">
      {plan.options.slice(0, 3).map((option) => (
        <div key={option.resource.id} className="space-y-2 rounded-lg bg-zinc-950 p-3 text-sm">
          <a href={option.resource.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-300 underline">{option.resource.name}</a>
          <p className="text-zinc-400">{option.resource.address}</p>
          <p className="text-zinc-300">{option.reasons.join(" · ")}</p>
          {option.resource.conflictNote && <p className="text-xs text-amber-200">Note: {option.resource.conflictNote}</p>}
          {asking === option.resource.id ? (
            <CallApproval record={record} stepId={step.id} option={option} onDone={() => setAsking(null)} />
          ) : (
            step.status !== "confirmed" && (
              <button className="rounded-full bg-zinc-800 px-4 py-1.5 text-xs font-semibold" onClick={() => setAsking(option.resource.id)}>Have Threshold call</button>
            )
          )}
        </div>
      ))}
      {plan.ifDeclined && (
        <p className="text-xs text-zinc-400">
          If the first says no: {plan.ifDeclined.next.resource.name}
          {plan.ifDeclined.via ? ` (${plan.ifDeclined.via.reason})` : ""}
        </p>
      )}
    </div>
  );
}
