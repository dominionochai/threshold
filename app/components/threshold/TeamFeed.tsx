import { IconClipboardCheck, IconFolder, IconPhone, IconRoute, IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { workerOf, type Worker } from "@shared/engine/events";
import type { CaseRecord } from "@shared/engine/types";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICON: Record<Worker, ReactNode> = {
  Scout: <IconSearch className="size-4" />,
  Caller: <IconPhone className="size-4" />,
  Pathfinder: <IconRoute className="size-4" />,
  "Claim clerk": <IconClipboardCheck className="size-4" />,
  Case: <IconFolder className="size-4" />,
};

const ROLE: Record<Worker, string> = {
  Scout: "Finds places that fit your family",
  Caller: "Calls for you, only after your yes",
  Pathfinder: "Finds the next place if one says no",
  "Claim clerk": "Gathers your SNAP claim",
  Case: "Your record",
};

/** What the helpers are doing, in their own words, newest first. This is the agent's voice made visible. */
export function TeamFeed({ record }: { record: CaseRecord }) {
  const messages = record.events
    .map((event) => ({ event, worker: workerOf(event.type) }))
    .filter((m): m is { event: CaseRecord["events"][number]; worker: Worker } => m.worker !== null)
    .slice(0, 14);

  return (
    <section aria-labelledby="team-heading" className="space-y-3 pt-2">
      <div>
        <h2 id="team-heading" className="text-[20px] font-semibold tracking-[-0.01em]">
          Your team
        </h2>
        <p className="text-[15px] text-th-muted">What your helpers are doing, as it happens.</p>
      </div>
      <ol className="space-y-3">
        {messages.map(({ event, worker }) => (
          <li key={event.id} className="th-in flex gap-3">
            <span
              title={ROLE[worker]}
              className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border", worker === "Caller" ? "border-th-amber/50 text-th-amber" : "border-th-line text-th-muted")}
            >
              {ICON[worker]}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl rounded-ss-md border border-th-line bg-th-surface px-3.5 py-2.5">
              <p className="flex items-baseline justify-between gap-2 text-[13px] text-th-muted">
                <span className="font-semibold text-th-text">{worker}</span>
                <time>{clock(event.timestamp)}</time>
              </p>
              <p className="pt-0.5 text-[16px] leading-snug">{event.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
