import type { Edge } from "@shared/engine/pathfinder";
import type { ScoutResult } from "@shared/engine/scout";

interface Plan {
  options: ScoutResult[];
  ifDeclined: { next: ScoutResult; via: Edge | null } | null;
}

export function ScoutList({ plan }: { plan: Plan | undefined }) {
  if (!plan) return null;
  if (plan.options.length === 0) {
    return <p className="text-sm text-zinc-400">No sourced place on file takes this household for this need yet.</p>;
  }
  return (
    <div className="space-y-2">
      {plan.options.slice(0, 3).map(({ resource, reasons }) => (
        <div key={resource.id} className="rounded-lg bg-zinc-950 p-3 text-sm">
          <a href={resource.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-300 underline">{resource.name}</a>
          <p className="text-zinc-400">{resource.address}</p>
          <p className="text-zinc-300">{reasons.join(" · ")}</p>
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
