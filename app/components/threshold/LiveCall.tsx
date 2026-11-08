import type { ActiveCall } from "@shared/engine/types";

/** The call in progress, as the parent sees it: who is being called, and what is being said. */
export function LiveCall({ call }: { call: ActiveCall }) {
  return (
    <section aria-live="polite" className="m-4 space-y-2 rounded-2xl border border-th-amber/40 bg-th-surface p-4">
      <p className="text-[17px] font-semibold text-th-amber">
        {call.status === "ringing" ? `Calling ${call.resourceName}…` : `On the phone with ${call.resourceName}`}
      </p>
      {call.turns.map((turn, i) => (
        <p key={i} className="text-[16px] leading-snug">
          <span className="font-semibold text-th-muted">{turn.who === "agent" ? "Caller" : "Staff"}: </span>
          {turn.text}
        </p>
      ))}
    </section>
  );
}
