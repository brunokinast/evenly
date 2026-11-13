import { newDraft, type ExpenseDraft } from "./draft";
import type { Member, Trip } from "./types";

// Gemini intake (specs/features/assistant.md): reading the events Gemini writes into the "Evenly" calendar.

/** An event of the "Evenly" calendar, as the phone's calendar gives it. */
export type IntakeEvent = { id: string; title: string; start: number; allDay: boolean };

/** AST-2: the title's parts, as written. `people`/`trip`/`payer` are null when not said. */
export type ParsedTitle = {
  cents: number | null;
  what: string;
  people: string[] | null;
  trip: string | null;
  payer: string | null;
};

export const MAX_CENTS = 10_000_000_000; // EXP-1, as the rules allow

/**
 * AST-4: the first number in the text as cents. Reads 32, 32.50, 32,50, 1.234,56 and 1,234.56: with both
 * separators the last one is the decimal point; with one kind, it's decimal only when it appears once and
 * is followed by one or two digits ("1.234" is a thousand).
 */
export function parseAmount(text: string): number | null {
  const m = /\d+(?:[.,]\d+)*/.exec(text);
  if (!m) return null;
  const num = m[0];
  const last = Math.max(num.lastIndexOf("."), num.lastIndexOf(","));
  let whole = num;
  let frac = "";
  if (last >= 0) {
    const sep = num[last]!;
    const mixed = num.includes(".") && num.includes(",");
    const after = num.slice(last + 1);
    if (mixed || (num.indexOf(sep) === last && after.length <= 2)) {
      whole = num.slice(0, last);
      frac = after;
    }
  }
  const cents = Number(whole.replace(/[.,]/g, "")) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
  return cents > 0 && cents <= MAX_CENTS ? cents : null;
}

const CURRENCY_WORDS =
  /(?:R\$|US\$|\$|€|£|\b(?:reais|real|dollars?|d[oó]lares|d[oó]lar|euros?|pounds?|libras?|bucks)\b)/giu;

/** AST-2 format, or (AST-4) a title without `|`: its first number is the amount, the rest what it was for. */
export function parseTitle(title: string): ParsedTitle {
  const clean = title.replace(/^\s*evenly\b[\s,:.-]*/i, "");
  if (!clean.includes("|")) {
    const cents = parseAmount(clean);
    const what = clean
      .replace(/\d+(?:[.,]\d+)*/, "")
      .replace(CURRENCY_WORDS, "")
      .replace(/\s+/g, " ")
      .trim();
    return { cents, what, people: null, trip: null, payer: null };
  }
  const [amount = "", what = "", people = "", trip = "", payer = ""] = clean.split("|").map((s) => s.trim());
  const names = people
    .split(/\s*(?:,|;|\/|&|\+|\band\b|\be\b|\bcom\b|\bwith\b)\s*/i)
    .map((n) => n.trim())
    .filter(Boolean);
  return {
    cents: parseAmount(amount),
    what,
    people: names.length ? names : null,
    trip: trip || null,
    payer: payer || null,
  };
}

// ---------- matching (AST-5) ----------

/** Lower case, no accents, single spaces. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Words that never tell names apart ("the Lisbon trip", "viagem para Lisboa", "a Ana"). */
const FILLER = new Set(
  "a an the of to for with and my our trip travel o os as da de do das dos na no nas nos para com e minha meu nossa nosso viagem".split(
    " ",
  ),
);

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length]!;
}

function wordScore(q: string, c: string): number {
  if (q === c) return 1;
  if (Math.min(q.length, c.length) >= 2 && (c.startsWith(q) || q.startsWith(c))) return 0.9;
  return 1 - editDistance(q, c) / Math.max(q.length, c.length);
}

/** How well `query` names `candidate`, 0–1: each meaningful word of the query against its best word. */
export function matchScore(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  const words = (s: string) => {
    const all = s.split(" ");
    const meaningful = all.filter((w) => !FILLER.has(w));
    return meaningful.length ? meaningful : all;
  };
  const cw = words(c);
  const qw = words(q);
  const perWord = qw.reduce((sum, w) => sum + Math.max(...cw.map((x) => wordScore(w, x))), 0) / qw.length;
  // A little weight on the whole name tells "Ana" from "Ana Paula" when the query is "Ana".
  return 0.85 * perWord + 0.15 * wordScore(qw.join(" "), cw.join(" "));
}

const SURE = 0.8;
const CLOSE = 0.08;

/** AST-5: the best match is always used; it's a guess when weak or nearly tied with the runner-up. */
export function bestMatch<T>(
  query: string,
  items: readonly T[],
  nameOf: (item: T) => string,
): { item: T; guess: boolean } | null {
  const scored = items
    .map((item) => ({ item, score: matchScore(query, nameOf(item)) }))
    .sort((a, b) => b.score - a.score);
  const [best, next] = scored;
  if (!best) return null;
  return { item: best.item, guess: best.score < SURE || (!!next && next.score > best.score - CLOSE) };
}

const ME_WORDS = new Set(["me", "i", "eu", "mim", "myself", "you", "voce"]);
const ALL_WORDS = new Set([
  "all",
  "everyone",
  "everybody",
  "all of us",
  "us",
  "todos",
  "todas",
  "todo mundo",
  "geral",
  "galera",
  "nos",
  "nos todos",
]);

/** The fields a review line can have marked as a guess (AST-5, AST-7). */
export type GuessField = "trip" | "payer" | "split";

/** One expense read from the calendar, ready for the review (AST-6). */
export type Pending = {
  eventId: string;
  /** What Gemini wrote, shown under an opened line. */
  title: string;
  tripId: string;
  draft: ExpenseDraft;
  guesses: GuessField[];
};

/**
 * AST-4: an event as a review line. `trips` in Home's order (TRIP-12: the first is the default trip);
 * null when there's no trip to add it to.
 */
export function readEvent(
  ev: IntakeEvent,
  trips: readonly Trip[],
  myUid: string,
  opts: { now: number; fallbackDescription: string },
): Pending | null {
  const p = parseTitle(ev.title);
  const guesses: GuessField[] = [];

  let trip = trips[0];
  if (p.trip) {
    const m = bestMatch(p.trip, trips, (t) => t.name);
    if (m) {
      trip = m.item;
      if (m.guess) guesses.push("trip");
    }
  }
  if (!trip) return null;
  const myId = trip.memberIdsByUid[myUid] ?? "";

  // A word meaning "me" is me; anything else goes to the member whose name matches best.
  const member = (name: string): { id: string; guess: boolean } | null => {
    if (ME_WORDS.has(normalize(name))) return { id: myId, guess: false };
    const m = bestMatch(name, trip.members, (x: Member) => x.name);
    return m && { id: m.item.id, guess: m.guess };
  };

  const draft = newDraft(trip, myId, Math.min(eventTime(ev), opts.now));
  draft.cents = p.cents;
  draft.description = (p.what || opts.fallbackDescription).slice(0, 100);

  if (p.payer) {
    const m = member(p.payer);
    if (m) {
      draft.payerId = m.id;
      if (m.guess) guesses.push("payer");
    }
  }

  const named = p.people?.filter((n) => !ALL_WORDS.has(normalize(n))) ?? [];
  if (named.length) {
    const ids = new Set([myId]); // "split with Ana" includes me
    let guessed = false;
    for (const name of named) {
      const m = member(name);
      if (!m) continue;
      ids.add(m.id);
      guessed ||= m.guess;
    }
    draft.parts = trip.members.map((x) => x.id).filter((id) => ids.has(id));
    if (guessed) guesses.push("split");
  }

  return { eventId: ev.id, title: ev.title, tripId: trip.id, draft, guesses };
}

/** AST-4: the event's start; an all-day event (stored as UTC midnight) means noon that day, local time. */
function eventTime(ev: IntakeEvent): number {
  if (!ev.allDay) return ev.start;
  const d = new Date(ev.start);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12).getTime();
}
