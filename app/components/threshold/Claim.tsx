import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconCheck, IconCircleDashed, IconLink } from "@tabler/icons-react";
import { REQUIREMENT_LABEL } from "@shared/engine/claim";
import { linkEvidence, type EvidenceLink } from "@shared/engine/evidence";
import type { CaseRecord } from "@shared/engine/types";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, Chip, Heading } from "./ui";

const DEADLINES = [
  { days: "10 days", what: "to hand in your documents" },
  { days: "7 days", what: "until your interview" },
  { days: "30 days", what: "for the decision" },
];

function Row({ link, busy, onToggle }: { link: EvidenceLink; busy: boolean; onToggle: (verified: boolean) => void }) {
  const { title, help } = REQUIREMENT_LABEL[link.requirement];
  const ready = link.state === "ready";
  const latest = link.proof[0];
  return (
    <li className="space-y-2.5 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border", ready ? "border-th-open bg-th-open text-th-ink" : link.state === "backed" ? "border-th-amber text-th-amber" : "border-dashed border-th-muted text-th-muted")}>
          {ready ? <IconCheck className="size-4" aria-hidden="true" /> : link.state === "backed" ? <IconLink className="size-3.5" aria-hidden="true" /> : <IconCircleDashed className="size-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-semibold leading-snug">{title}</p>
          <p className="text-[15px] leading-snug text-th-muted">{help}</p>
        </div>
      </div>

      {latest ? (
        <div className="ms-10 rounded-xl border border-th-amber/40 bg-th-amber/10 px-3 py-2.5">
          <p className="text-[13px] font-semibold text-th-amber">From tonight, {clock(latest.timestamp)}</p>
          <p className="text-[15px] leading-snug">{latest.description}</p>
        </div>
      ) : null}

      <div className="ms-10">
        <button
          onClick={() => onToggle(!ready)}
          disabled={busy}
          aria-pressed={ready}
          className={cn(
            "th-press min-h-12 rounded-full border px-4 text-[16px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-th-amber",
            ready ? "border-th-open/50 text-th-open" : link.state === "backed" ? "border-th-amber bg-th-amber text-th-ink" : "border-th-line text-th-text",
          )}
        >
          {ready ? "Ready. Tap to undo" : link.state === "backed" ? "Use this for my claim" : "I have this"}
        </button>
      </div>
    </li>
  );
}

/** Tonight's trail lined up against what the SNAP claim asks for. Never decides eligibility. */
export function Claim({ record }: { record: CaseRecord }) {
  const update = useActionMutation("update-evidence");
  const links = linkEvidence(record.events, record.evidence);
  const ready = links.filter((l) => l.state === "ready").length;
  const backed = links.filter((l) => l.state === "backed").length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Heading>Your SNAP claim.</Heading>
        <p className="text-[17px] leading-snug text-th-muted">Everything that happens tonight is saved with a time. We line it up against what the claim asks for, so you're not starting from nothing.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip tone={ready === links.length ? "open" : "neutral"}>
            {ready} of {links.length} ready
          </Chip>
          {backed > 0 ? <Chip tone="amber">{backed} backed by tonight</Chip> : null}
        </div>
      </div>

      <Card>
        <ul className="divide-y divide-th-line">
          {links.map((link) => (
            <Row key={link.requirement} link={link} busy={update.isPending} onToggle={(verified) => update.mutate({ requirement: link.requirement, verified })} />
          ))}
        </ul>
        {update.error ? (
          <p role="alert" className="pt-3 text-[15px] text-th-closed">
            {update.error.message}
          </p>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">The clock after you apply</h2>
        <ul className="space-y-2">
          {DEADLINES.map((d) => (
            <li key={d.days} className="flex items-baseline gap-3">
              <span className="w-20 shrink-0 text-[22px] font-semibold tracking-[-0.02em] text-th-amber">{d.days}</span>
              <span className="text-[16px] text-th-muted">{d.what}</span>
            </li>
          ))}
        </ul>
        <p className="text-[14px] leading-snug text-th-muted">These counts start when you apply. Threshold doesn't file your claim or decide if you qualify.</p>
      </Card>
    </div>
  );
}
