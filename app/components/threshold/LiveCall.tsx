import type { ActiveCall } from "@shared/engine/types";

/** Placeholder for the call in progress. Restyle freely: it only needs `call.status`, `call.resourceName` and `call.turns`. */
export function LiveCall({ call }: { call: ActiveCall }) {
  return (
    <section className="space-y-2 rounded-xl border border-amber-400 bg-zinc-900 p-4 text-sm">
      <p className="font-semibold text-amber-300">
        {call.status === "ringing" ? `Calling ${call.resourceName}…` : `On the phone with ${call.resourceName}`}
      </p>
      {call.turns.map((turn, i) => (
        <p key={i} className={turn.who === "agent" ? "text-zinc-100" : "text-amber-200"}>
          <span className="text-zinc-500">{turn.who === "agent" ? "Threshold" : "Staff"}:</span> {turn.text}
        </p>
      ))}
    </section>
  );
}
