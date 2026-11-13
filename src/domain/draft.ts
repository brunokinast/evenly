import { customShares, equalShares, withoutZeroShares, type CustomSplit } from "./split";
import type { Expense, ExpenseInput, Trip } from "./types";

/**
 * An expense being edited, before it's saved: the Add/Edit expense form and the Gemini review (AST-6) both
 * edit this shape, with the same pickers, checks and save.
 */
export type ExpenseDraft = {
  cents: number | null;
  description: string;
  payerId: string;
  /** Participants (member ids). */
  parts: string[];
  custom: boolean;
  /** Custom split: amounts typed per person (EXP-12). */
  typed: Record<string, number>;
  spentAt: number;
};

/** EXP-10: paid by me, split equally between all, dated now. */
export function newDraft(trip: Trip, myId: string, now: number): ExpenseDraft {
  return {
    cents: null,
    description: "",
    payerId: myId,
    parts: trip.members.map((m) => m.id),
    custom: false,
    typed: {},
    spentAt: now,
  };
}

/** Edit expense: the saved expense as a draft; people no longer in the trip drop out (EXP-6). */
export function draftOf(trip: Trip, myId: string, e: Expense): ExpenseDraft {
  const ids = trip.members.map((m) => m.id);
  const parts = ids.filter((id) => id in e.shares);
  return {
    cents: e.amountCents,
    description: e.description,
    payerId: ids.includes(e.payerId) ? e.payerId : myId,
    parts,
    custom: e.split === "custom",
    typed: e.split === "custom" ? Object.fromEntries(parts.map((id) => [id, e.shares[id]!])) : {},
    spentAt: e.spentAt,
  };
}

export type DraftCheck = {
  /** Participants in member order; members removed meanwhile drop out (EXP-6). */
  parts: string[];
  payerOk: boolean;
  /** A custom split with at least one typed amount. */
  isCustom: boolean;
  split: CustomSplit | null;
  /** Custom split only: cents still to assign (> 0) or over the total (< 0). */
  remaining: number;
  /** Everyone in the trip shares it equally ("Split between all"). */
  allIn: boolean;
  /** EXP-1, EXP-6, EXP-12: can be saved. */
  valid: boolean;
};

export function checkDraft(trip: Trip, d: ExpenseDraft): DraftCheck {
  const order = trip.members.map((m) => m.id);
  const parts = order.filter((id) => d.parts.includes(id));
  const payerOk = order.includes(d.payerId);
  const isCustom = d.custom && Object.keys(d.typed).length > 0;
  const split = isCustom ? customShares(d.cents ?? 0, parts, d.typed, d.payerId) : null;
  const remaining = split?.remaining ?? 0;
  return {
    parts,
    payerOk,
    isCustom,
    split,
    remaining,
    allIn: parts.length === order.length && !isCustom,
    valid:
      (d.cents ?? 0) > 0 && d.description.trim() !== "" && parts.length > 0 && payerOk && remaining === 0,
  };
}

/** What Save writes (BAL-2 shares computed once, here), or null while the draft isn't valid. */
export function draftInput(trip: Trip, d: ExpenseDraft): ExpenseInput | null {
  const c = checkDraft(trip, d);
  if (!c.valid) return null;
  const cents = d.cents!;
  return {
    description: d.description.trim().slice(0, 100),
    amountCents: cents,
    payerId: d.payerId,
    shares: c.isCustom ? withoutZeroShares(c.split!.shares) : equalShares(cents, c.parts, d.payerId),
    split: c.isCustom ? "custom" : "equal",
    spentAt: d.spentAt,
  };
}

/** EXP-13: a new total resets a custom split to equal (`splitReset` says to tell the user). */
export function withCents(
  d: ExpenseDraft,
  cents: number | null,
): { draft: ExpenseDraft; splitReset: boolean } {
  const splitReset = d.custom && Object.keys(d.typed).length > 0 && cents !== d.cents;
  return { draft: { ...d, cents, ...(splitReset && { custom: false, typed: {} }) }, splitReset };
}

/** AST-8: moved to another trip: same description, amount and time; payer and split back to the defaults. */
export function withTrip(d: ExpenseDraft, trip: Trip, myId: string): ExpenseDraft {
  return { ...newDraft(trip, myId, d.spentAt), cents: d.cents, description: d.description };
}
