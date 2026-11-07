import { NEIGHBORHOODS } from "../data/neighborhoods";
import { distanceKm, type LatLng } from "./geo";
import { NEEDS, type Need } from "./types";

/** What we understood from a person's own words, typed or dictated. Never stored as raw text. */
export interface Story {
  needs: Need[];
  /** Ages we could read directly (0-17). Never guessed. */
  ages: number[];
  /** True when children are mentioned but we do not have an age for each of them. */
  needsAges: boolean;
  /** A neighborhood we know, if the text names one. */
  location: string | null;
  /** Someone may be in danger right now: show the right emergency number first. */
  emergency: "911" | "988" | null;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
};
const NUM = `(?:\\d{1,2}|${Object.keys(NUMBER_WORDS).join("|")})`;

const NEED_PATTERNS: Record<Need, RegExp> = {
  food: /\b(hungry|hunger|starving|food|eat|eaten|meal|meals|groceries|formula|pantry)\b/,
  bed: /\b(sleep|slept|shelter|homeless|evict(?:ed|ion)?|nowhere to (?:go|stay|sleep)|no place to (?:go|stay|sleep)|place to stay|on the street|streets|kicked out|bed|lost my (?:home|apartment)|locked out)\b/,
  medical: /\b(sick|fever|hurt|hurting|pain|bleed(?:ing)?|asthma|pregnan\w*|medicine|medication|meds|doctor|hospital|injur\w*|cough\w*|breath\w*|insulin|ill|vomit\w*|dizzy|infection|diabet\w*)\b/,
  legal: /\b(evict(?:ed|ion)?|lawyer|attorney|court|landlord|legal|lockout|locked out|custody|lease|notice to quit|marshal)\b/,
};

const EMERGENCY_911 =
  /\b(chest pain|can'?t breathe|cannot breathe|not breathing|stopped breathing|unconscious|passed out|overdos\w*|severe bleeding|bleeding (?:a lot|heavily|won'?t stop)|seizure|stroke|choking|being attacked|someone is (?:hurting|attacking) me)\b/;
const EMERGENCY_988 = /\b(suicid\w*|kill myself|end my life|want to die|hurt myself|self[- ]harm)\b/;

const ALIASES: Record<string, string> = { "bed-stuy": "Bedford-Stuyvesant", "bed stuy": "Bedford-Stuyvesant" };

const toNumber = (token: string): number => (/^\d/.test(token) ? Number(token) : (NUMBER_WORDS[token] ?? NaN));
const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n <= 17;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every plausible child age in a short phrase such as "4 and 9" or "six, ten". */
export function parseAgeList(text: string): number[] {
  const ages: number[] = [];
  for (const m of text.toLowerCase().matchAll(new RegExp(`\\b${NUM}\\b`, "g"))) {
    const n = toNumber(m[0]);
    if (inRange(n)) ages.push(n);
  }
  return ages;
}

function readAges(text: string): number[] {
  const ages: number[] = [];
  const add = (n: number) => inRange(n) && ages.push(n);
  const speaker = (index: number) => /\bi(?:'|’)?m\s*$|\bi am\s*$/.test(text.slice(Math.max(0, index - 8), index));

  for (const m of text.matchAll(new RegExp(`\\b(${NUM})[\\s-]*(?:years?|yrs?)[\\s-]*old\\b|\\b(${NUM})[\\s-]*(?:yo|y/o)\\b`, "g"))) {
    if (!speaker(m.index ?? 0)) add(toNumber(m[1] ?? m[2] ?? ""));
  }
  for (const m of text.matchAll(new RegExp(`\\bages?\\s+((?:${NUM}(?:\\s*(?:,|and|&)\\s*)?)+)`, "g"))) {
    for (const n of parseAgeList(m[1] ?? "")) add(n);
  }
  let months = 0;
  for (const m of text.matchAll(new RegExp(`\\b(${NUM})[\\s-]*(?:months?|mos?)[\\s-]*old\\b`, "g"))) {
    months += 1;
    add(Math.floor(toNumber(m[1] ?? "") / 12));
  }
  if (months === 0) for (const _ of text.matchAll(/\b(?:baby|newborn|infant)\b/g)) add(0);
  return ages;
}

function countChildren(text: string): number {
  let explicit = 0;
  for (const m of text.matchAll(new RegExp(`\\b(${NUM})\\s+(?:kids?|children|daughters?|sons?)\\b`, "g"))) {
    explicit += toNumber(m[1] ?? "") || 0;
  }
  const single = [...text.matchAll(/\b(?:a|my|our)\s+(?:kid|child|daughter|son)\b/g)].length;
  const any = /\b(?:kids?|children|child|daughters?|sons?|baby|newborn|infant|toddler)\b/.test(text);
  return Math.max(explicit + single, any ? 1 : 0);
}

function findLocation(text: string): string | null {
  const names = [
    ...NEIGHBORHOODS.map((n) => ({ key: n.name.toLowerCase(), name: n.name })),
    ...Object.entries(ALIASES).filter(([, name]) => NEIGHBORHOODS.some((n) => n.name === name)).map(([key, name]) => ({ key, name })),
  ].sort((a, b) => b.key.length - a.key.length);
  const hit = names.find(({ key }) => new RegExp(`(?<![\\w-])${escapeRegExp(key)}(?![\\w-])`).test(text));
  return hit?.name ?? null;
}

export function parseStory(raw: string): Story {
  const text = raw.toLowerCase().replace(/’/g, "'");
  const ages = readAges(text);
  return {
    needs: NEEDS.filter((need) => NEED_PATTERNS[need].test(text)),
    ages,
    needsAges: ages.length < countChildren(text),
    location: findLocation(text),
    emergency: EMERGENCY_911.test(text) ? "911" : EMERGENCY_988.test(text) ? "988" : null,
  };
}

/** The known neighborhood closest to a position, or null when it is not in New York City. */
export function nearestNeighborhood(point: LatLng, maxKm = 40): { name: string; km: number } | null {
  const best = NEIGHBORHOODS.map((n) => ({ name: n.name, km: distanceKm(point, n) })).sort((a, b) => a.km - b.km)[0];
  return best && best.km <= maxKm ? best : null;
}
