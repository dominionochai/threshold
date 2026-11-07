import { useActionMutation } from "@agent-native/core/client/hooks";
import type { ScoutResult } from "@shared/engine/scout";
import type { CaseRecord } from "@shared/engine/types";

/** Nothing leaves the case until a person says yes. This is what the call will share. */
export function CallApproval({ record, stepId, option, onDone }: { record: CaseRecord; stepId: string; option: ScoutResult; onDone: () => void }) {
  const place = useActionMutation("place-call");
  const kids = record.children.length;
  return (
    <div className="space-y-2 rounded-lg border border-amber-400 p-3 text-sm">
      <p className="font-medium">Threshold will call {option.resource.name} and say it is an assistant calling for a family.</p>
      <p>
        <span className="text-zinc-400">Shares:</span> {kids} {kids === 1 ? "child" : "children"}
        {kids ? ` (ages ${record.children.join(", ")})` : ""}, {record.location}, and what is needed tonight.
      </p>
      <p><span className="text-zinc-400">Does not share:</span> a name, ID, income or immigration status.</p>
      {place.error && <p className="text-rose-400">{place.error.message}</p>}
      <div className="flex gap-2">
        <button
          className="rounded-full bg-amber-400 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-40"
          disabled={place.isPending}
          onClick={() => place.mutate({ stepId, resourceId: option.resource.id }, { onSuccess: onDone })}
        >
          Approve and call
        </button>
        <button className="rounded-full bg-zinc-800 px-4 py-2" onClick={onDone}>Not now</button>
      </div>
    </div>
  );
}
