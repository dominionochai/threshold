import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconCheck, IconLock, IconPencil, IconPhoneCall, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { resources } from "@shared/data/resources";
import { NEED_LABEL, type Approval } from "@shared/engine/types";
import { cn } from "@/lib/utils";
import { PrimaryButton, QuietButton } from "./ui";

/** The signature moment. Nothing leaves without a person's yes, and she reads every word first. */
export function ApprovalSheet({ approval, onClose }: { approval: Approval; onClose: () => void }) {
  const decide = useActionMutation("decide-approval");
  const place = resources.find((r) => r.id === approval.resourceId);
  const [lines, setLines] = useState(approval.script);
  const [editing, setEditing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pending = approval.status === "pending";
  const confirmed = approval.outcome === "confirmed";

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const send = (decision: "approve" | "decline", demoOutcome?: "accepts" | "declines") =>
    decide.mutate({ approvalId: approval.id, decision, ...(decision === "approve" && { script: lines }), ...(demoOutcome && { demoOutcome }) }, { onSuccess: () => decision === "decline" && onClose() });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Close" onClick={onClose} className="th-fade absolute inset-0 bg-black/70" />
      <div role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="th-sheet relative flex max-h-[92dvh] w-full max-w-[460px] flex-col rounded-t-[28px] border border-b-0 border-th-line bg-th-surface">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-th-line" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 px-5 pt-3">
          <div>
            <h2 id="sheet-title" className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">
              {pending ? "Caller wants to call" : confirmed ? "They said yes" : approval.status === "declined" ? "Call stood down" : "They couldn't help"}
            </h2>
            <p className="pt-0.5 text-[17px] text-th-muted">
              {place?.name} · {NEED_LABEL[approval.need].toLowerCase()}
            </p>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="th-press flex size-12 shrink-0 items-center justify-center rounded-full bg-th-raised focus-visible:outline-2 focus-visible:outline-th-amber">
            <IconX className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {pending ? (
            <>
              <p className="text-[16px] leading-snug text-th-muted">This is exactly what Caller will say. It says it's an assistant. Change anything you like first.</p>
              <ol className="space-y-2.5">
                {lines.map((line, i) => (
                  <li key={i} className="rounded-2xl rounded-es-md border border-th-line bg-th-raised px-3.5 py-3">
                    {editing ? (
                      <textarea
                        aria-label={`Line ${i + 1}`}
                        value={line}
                        onChange={(e) => setLines((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                        rows={3}
                        className="w-full resize-none bg-transparent text-[17px] leading-snug focus:outline-none"
                      />
                    ) : (
                      <p className="text-[17px] leading-snug">{line}</p>
                    )}
                  </li>
                ))}
              </ol>
              {lines.every((l) => !l.trim()) ? <p className="text-[15px] text-th-closed">Add at least one line for Caller to say.</p> : null}
              <p className="text-[14px] leading-snug text-th-muted">This is a rehearsed call for the demo: no real phone call is placed.</p>
            </>
          ) : (
            <ol className="space-y-2.5">
              {(approval.transcript ?? []).map((line, i) => (
                <li key={i} className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5", line.speaker === "assistant" ? "rounded-es-md border border-th-line bg-th-raised" : "ms-auto rounded-ee-md border border-th-amber/40 bg-th-amber/10")}>
                  <p className="pb-0.5 text-[13px] font-semibold text-th-muted">{line.speaker === "assistant" ? "Caller" : place?.name}</p>
                  <p className="text-[17px] leading-snug">{line.text}</p>
                </li>
              ))}
              {approval.status === "declined" ? <p className="text-[16px] text-th-muted">You said not now. Nothing was sent.</p> : null}
            </ol>
          )}
          {decide.error ? (
            <p role="alert" className="text-[15px] text-th-closed">
              {decide.error.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2.5 border-t border-th-line px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {pending ? (
            <>
              <PrimaryButton onClick={() => send("approve")} disabled={decide.isPending || lines.every((l) => !l.trim())}>
                <IconPhoneCall className="size-5" aria-hidden="true" />
                {decide.isPending ? "Calling…" : "Yes, make this call"}
              </PrimaryButton>
              <div className="grid grid-cols-2 gap-2.5">
                <QuietButton onClick={() => setEditing((e) => !e)}>
                  {editing ? <IconCheck className="size-5" aria-hidden="true" /> : <IconPencil className="size-5" aria-hidden="true" />}
                  {editing ? "Done" : "Edit"}
                </QuietButton>
                <QuietButton onClick={() => send("decline")} disabled={decide.isPending}>
                  Not now
                </QuietButton>
              </div>
              <p className="flex items-center justify-center gap-1.5 pt-1 text-[14px] text-th-muted">
                <IconLock className="size-3.5" aria-hidden="true" />
                Nothing leaves without your yes.
              </p>
              <details className="text-center">
                <summary className="inline-block cursor-pointer text-[13px] text-th-muted/70 underline underline-offset-2">Demo controls</summary>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <QuietButton className="min-h-12 text-[15px]" onClick={() => send("approve", "accepts")} disabled={decide.isPending}>
                    Force: they accept
                  </QuietButton>
                  <QuietButton className="min-h-12 text-[15px]" onClick={() => send("approve", "declines")} disabled={decide.isPending}>
                    Force: they decline
                  </QuietButton>
                </div>
              </details>
            </>
          ) : (
            <PrimaryButton onClick={onClose}>{confirmed ? "Got it" : "Close"}</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
