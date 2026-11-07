import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type Tab = "tonight" | "claim";

/** A doorway with light under it. */
function Mark() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
      <path d="M1.5 18.5V3a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 12.5 3v15.5" stroke="#F5F1EA" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M0 18.5h14" stroke="#F5B544" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <Mark />
      <span className="text-[19px] font-semibold tracking-[-0.02em]">threshold</span>
    </div>
  );
}

/** Tonight, then the claim. The two clocks, always in view. */
function Clocks({ tab, gaps }: { tab: Tab; gaps: number }) {
  return (
    <p className="flex items-center gap-2 rounded-full border border-th-line bg-th-surface px-3 py-1.5 text-[13px] font-medium" aria-label={`Tonight, then your claim. ${gaps} things still to gather.`}>
      <span className={cn("flex items-center gap-1.5", tab === "tonight" ? "text-th-amber" : "text-th-muted")}>
        <span className={cn("size-1.5 rounded-full", tab === "tonight" ? "bg-th-amber" : "bg-th-muted")} />
        Tonight
      </span>
      <span className="text-th-line" aria-hidden="true">
        /
      </span>
      <span className={tab === "claim" ? "text-th-amber" : "text-th-muted"}>Claim{gaps > 0 ? ` · ${gaps} to go` : " · ready"}</span>
    </p>
  );
}

/** `bleed` hands the whole screen between header and tab bar to the page (the map and sheet). */
export function Shell({ tab, onTab, gaps = 0, bleed, children }: { tab?: Tab; onTab?: (tab: Tab) => void; gaps?: number; bleed?: boolean; children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-th-ground text-th-text">
      <header className="sticky top-0 z-30 border-b border-th-line/60 bg-th-ground/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[460px] items-center justify-between px-4">
          <Wordmark />
          {tab ? <Clocks tab={tab} gaps={gaps} /> : null}
        </div>
      </header>

      <main className={bleed ? "" : cn("mx-auto w-full max-w-[460px] px-4 pt-6", onTab ? "pb-36" : "pb-40")}>{children}</main>

      {tab && onTab ? (
        <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 border-t border-th-line/60 bg-th-ground/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
          <div className="mx-auto grid max-w-[460px] grid-cols-2">
            {(
              [
                ["tonight", "Tonight"],
                ["claim", "Claim"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => onTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "th-press relative flex min-h-16 items-center justify-center text-[17px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-th-amber",
                  tab === id ? "text-th-amber" : "text-th-muted",
                )}
              >
                {label}
                {tab === id ? <span className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-th-amber" /> : null}
              </button>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
