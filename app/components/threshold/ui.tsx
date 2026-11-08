import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "open" | "closed" | "amber";

const TONE: Record<Tone, string> = {
  neutral: "border-th-line bg-th-raised text-th-muted",
  open: "border-th-open/40 bg-th-open/10 text-th-open",
  closed: "border-th-closed/40 bg-th-closed/10 text-th-closed",
  amber: "border-th-amber/50 bg-th-amber/10 text-th-amber",
};

/** Status is always an icon and a word together, never color alone. */
export function Chip({ tone = "neutral", dashed, icon, children }: { tone?: Tone; dashed?: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium leading-none", TONE[tone], dashed && "border-dashed")}>
      {icon}
      {children}
    </span>
  );
}

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <section className={cn("rounded-[20px] border border-th-line bg-th-surface p-4", className)}>{children}</section>
);

/** The one amber button on a screen: the next action. */
export const PrimaryButton = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={cn(
      "th-press flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-th-amber px-5 text-[17px] font-semibold text-th-ink",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-th-amber disabled:bg-th-raised disabled:text-th-muted",
      className,
    )}
  />
);

export const QuietButton = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={cn(
      "th-press flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-th-line bg-th-raised px-5 text-[17px] font-medium text-th-text",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-th-amber disabled:opacity-50",
      className,
    )}
  />
);

export const Heading = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h1 className={cn("text-[30px] font-semibold leading-[1.08] tracking-[-0.02em]", className)}>{children}</h1>
);
