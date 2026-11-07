import { z } from "zod";
import { DAYS, type Day, type Hours } from "./resource";

export type Openness = { status: "open"; closes: string | null } | { status: "closed" } | { status: "unknown" };

const PREVIOUS: Record<Day, Day> = { sun: "sat", mon: "sun", tue: "mon", wed: "tue", thu: "wed", fri: "thu", sat: "fri" };

const newYork = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));

/** Whether a place is open at `at`, judged on New York time. Unknown hours stay unknown. */
export function openness(hours: Hours | null, at: Date): Openness {
  if (hours === null) return { status: "unknown" };
  if (hours === "24/7") return { status: "open", closes: null };

  const part = (type: string) => newYork.formatToParts(at).find((p) => p.type === type)?.value ?? "";
  const day = z.enum(DAYS).parse(part("weekday").toLowerCase().slice(0, 3));
  const now = Number(part("hour")) * 60 + Number(part("minute"));

  for (const [open, close] of hours[day] ?? []) {
    const spansMidnight = minutes(close) <= minutes(open);
    if (now >= minutes(open) && (spansMidnight || now < minutes(close))) return { status: "open", closes: close };
  }
  for (const [open, close] of hours[PREVIOUS[day]] ?? []) {
    if (minutes(close) <= minutes(open) && now < minutes(close)) return { status: "open", closes: close };
  }
  return { status: "closed" };
}
