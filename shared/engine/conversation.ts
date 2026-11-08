import { z } from "zod";
import type { Resource } from "./resource";
import type { Household, Need, StepStatus, Turn } from "./types";

export type { Turn };

export const turnSchema = z.object({ who: z.enum(["agent", "shelter"]), text: z.string().max(1000) });
export const lineSchema = z.object({ say: z.string().min(1), endCall: z.boolean() });

export const outcomeSchema = z.object({
  result: z.enum(["confirmed", "declined", "callback", "unclear"]),
  summary: z.string(),
  instructions: z.array(z.string()),
  spokeWith: z.string().nullable(),
});
export type Outcome = z.infer<typeof outcomeSchema>;

export const NO_ANSWER: Outcome = {
  result: "unclear",
  summary: "The call ended before anyone at the other end said anything.",
  instructions: [],
  spokeWith: null,
};

const STEP_STATUS: Record<Outcome["result"], StepStatus> = {
  confirmed: "confirmed",
  declined: "declined",
  callback: "waiting",
  unclear: "waiting",
};

export const stepStatusFor = (outcome: Outcome): StepStatus => STEP_STATUS[outcome.result];

export function callerPrompt(household: Household, resource: Resource, need: Need): string {
  const kids = household.children.length;
  return `You are Threshold's assistant, on the phone with ${resource.name} (${resource.address}), calling for a mother in ${household.location}, New York City. You are not the mother. Say plainly, early on, that you are an assistant calling for a family.

What you know and may share: she has ${kids} ${kids === 1 ? "child" : "children"}${kids ? `, ages ${household.children.join(" and ")}` : ""}, and tonight she needs ${need}. Nothing else. Never invent or volunteer anything about her: name, ID, income, immigration status, why she is in this situation. If you are asked for something you do not have, say you will check with her and ask exactly what they need from her.

Find out, one question at a time: can they take the family tonight, where exactly to go and by what time, what she must bring, who to ask for, whether there is a wait. If they say no, ask once where they would send a family tonight, then thank them.

Talk the way a calm, kind person talks on the phone: short sentences, plain words, contractions. React to what they actually say, including when they are rushed, interrupt, or ask you to repeat. Never use lists, markdown or stage directions.

Reply only with JSON: {"say": "<your next words>", "endCall": <true or false>}. Set endCall true only on the turn where you say goodbye.`;
}

export const clerkPrompt = (resource: Resource) =>
  `Read this phone call between Threshold's assistant and staff at ${resource.name}. Report only what was actually said; infer nothing.
Reply only with JSON: {"result": "confirmed" | "declined" | "callback" | "unclear", "summary": "<one or two plain sentences>", "instructions": ["<each thing the family must bring or do, as stated>"], "spokeWith": "<name or role if stated, else null>"}.
confirmed = they said the family can come or there is space. declined = they said no. callback = they said to call back or wait. unclear = anything else.`;

export const transcriptText = (turns: readonly Turn[]) =>
  turns.map((t) => `${t.who === "agent" ? "Assistant" : "Staff"}: ${t.text}`).join("\n");

/** Gemini needs a conversation that starts with the user and alternates, so the caller's lines are "model". */
export function toContents(turns: readonly Turn[]) {
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [{ role: "user", parts: [{ text: "(The line is picked up.)" }] }];
  for (const turn of turns) {
    const role = turn.who === "agent" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last?.role === role) last.parts.push({ text: turn.text });
    else contents.push({ role, parts: [{ text: turn.text }] });
  }
  return contents;
}

/** The caller's next scripted line, given how many lines it has already spoken. */
export function scriptedStep(lines: readonly string[], turns: readonly Turn[]) {
  const spoken = turns.filter((t) => t.who === "agent").length;
  const index = Math.min(spoken, lines.length - 1);
  return { say: lines[index] ?? "", endCall: index === lines.length - 1 };
}

const REFUSAL = /\b(no space|no beds?|no room|we(?:'re| are) full|can(?:no|')t|unable|not able|full tonight)\b/i;
const WELCOME = /\b(yes|yeah|sure|we can|we do|we have|come in|bring (?:them|her|the family)|have (?:a )?(?:room|space|bed)|available)\b/i;
const TO_DO = /\b(bring|before|by \d|arrive|ask for|id)\b/i;

/** Reads what staff said without a model, so the scripted demo never depends on one. */
export function outcomeFromStaff(turns: readonly Turn[], placeName: string): Outcome {
  const said = turns.filter((t) => t.who === "shelter").map((t) => t.text);
  if (said.length === 0) return NO_ANSWER;
  const all = said.join(" ");
  const refused = REFUSAL.test(all);
  const welcomed = WELCOME.test(all);
  const result = welcomed && !refused ? "confirmed" : refused && !welcomed ? "declined" : "unclear";
  const instructions = said.flatMap((line) => line.split(/(?<=[.!?])\s+/)).filter((sentence) => TO_DO.test(sentence)).map((sentence) => sentence.replace(/[.!?]+$/, "").trim()).slice(0, 3);
  const summary =
    result === "confirmed" ? `${placeName} said they can take the family tonight.` : result === "declined" ? `${placeName} said they cannot take the family tonight.` : `${placeName} did not clearly say yes or no.`;
  return { result, summary, instructions: result === "confirmed" ? instructions : [], spokeWith: null };
}
