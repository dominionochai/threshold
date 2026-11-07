import { openness } from "./hours";
import type { Resource } from "./resource";
import { NEED_LABEL, type CallOutcome, type Household, type Need, type TranscriptLine } from "./types";

const NEED_PHRASE: Record<Need, string> = { food: "food", bed: "a bed", medical: "medical care", legal: "legal help" };

function listAges(ages: readonly number[]): string {
  const sorted = [...ages].sort((a, b) => a - b).map(String);
  return sorted.length > 1 ? `${sorted.slice(0, -1).join(", ")} and ${sorted.at(-1)}` : (sorted[0] ?? "");
}

/** The words the assistant would say. It says it is an assistant, and the parent sees every line before anything happens. */
export function draftCall(household: Household, need: Need): string[] {
  const kids = household.children.length;
  const children = kids === 0 ? "" : `, and there ${kids === 1 ? "is 1 child" : `are ${kids} children`} with them, age${kids === 1 ? "" : "s"} ${listAges(household.children)}`;
  return [
    `Hello, this is an assistant calling for a family in ${household.location}. The parent asked me to call and has approved this call.`,
    `They need ${NEED_PHRASE[need]} tonight${children}.`,
    "Are you open right now, and can you take them?",
    "Where exactly should they go, and is there anything they need to bring?",
    "Thank you. I'll tell the parent right away.",
  ];
}

export interface CallResult {
  outcome: CallOutcome;
  reason: string;
  transcript: TranscriptLine[];
}

/**
 * A rehearsed call. No phone call is placed and no facility is contacted.
 * The facility's side is built only from what the sourced record says: its address and its note.
 * `demo` forces the answer so a decline can be shown on demand.
 */
export function simulateCall(resource: Resource, script: readonly string[], at: Date, demo?: "accepts" | "declines"): CallResult {
  const status = openness(resource.hours, at).status;
  const accepts = demo ? demo === "accepts" : status === "open";
  const reason = demo
    ? accepts ? "Demo: they accepted." : "Demo: they said no."
    : status === "open" ? "Open now." : status === "closed" ? "Closed now." : "No hours on file, so we could not confirm anyone is answering.";

  const lines = script.map((l) => l.trim()).filter(Boolean);
  const closing = lines.length > 1 ? lines.pop() : undefined;
  const followUp = lines.length > 2 ? lines.pop() : undefined;
  const say = (text: string): TranscriptLine => ({ speaker: "assistant", text });
  const reply = (text: string): TranscriptLine => ({ speaker: "facility", text });

  const transcript: TranscriptLine[] = lines.map(say);
  if (accepts) {
    transcript.push(reply("Yes, we're open."));
    if (followUp) transcript.push(say(followUp));
    transcript.push(reply(`Come to ${resource.address}.${resource.note ? ` ${resource.note}` : ""}`));
  } else {
    transcript.push(reply(status === "closed" && !demo ? "No, we're closed right now." : "I'm sorry, we can't take them right now."));
  }
  if (closing) transcript.push(say(closing));
  return { outcome: accepts ? "confirmed" : "declined", reason, transcript };
}

/** What to say when no sourced place is left. Honest and short: the city line, plus 911 for a medical emergency. */
export function cityHelp(household: Pick<Household, "children" | "location">, need: Need): string {
  if (need === "bed") {
    const who = household.children.length > 0 ? "a family with children who need shelter tonight" : "someone who needs shelter tonight";
    return `Call 311 and say you're ${who}.`;
  }
  if (need === "medical") return `If it's an emergency, call 911. Otherwise call 311 and ask for medical care near ${household.location}.`;
  return `Call 311 and ask for ${NEED_LABEL[need].toLowerCase()} near ${household.location}.`;
}
