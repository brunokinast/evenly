/**
 * BAL-2: each participant gets floor(amount / n); the leftover cents go to the payer if they participate,
 * otherwise to the first participant. `participants` must be in member order.
 */
export function equalShares(
  amountCents: number,
  participants: string[],
  payerId: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  const n = participants.length;
  if (n === 0) return out;
  const base = Math.floor(amountCents / n);
  for (const id of participants) out[id] = base;
  const leftoverTo = participants.includes(payerId) ? payerId : participants[0]!;
  out[leftoverTo]! += amountCents - base * n;
  return out;
}

export type CustomSplit = {
  /** Every participant's share: typed ones as typed, the others share what's left (BAL-2 rule). */
  shares: Record<string, number>;
  /** Participants without a typed amount; their share is the automatic hint. */
  auto: string[];
  /** > 0: still to assign; < 0: typed amounts are over the total; 0: adds up. */
  remaining: number;
};

/** EXP-12: typed amounts stay as typed; everyone else splits the rest equally. */
export function customShares(
  amountCents: number,
  participants: string[],
  typed: Record<string, number>,
  payerId: string,
): CustomSplit {
  const typedIds = participants.filter((id) => id in typed);
  const auto = participants.filter((id) => !(id in typed));
  const left = amountCents - typedIds.reduce((sum, id) => sum + typed[id]!, 0);
  const shares: Record<string, number> = {};
  for (const id of typedIds) shares[id] = typed[id]!;
  if (auto.length > 0) Object.assign(shares, equalShares(Math.max(left, 0), auto, payerId));
  return { shares, auto, remaining: auto.length > 0 ? Math.min(left, 0) : left };
}

/** EXP-12: a participant whose share is 0 is not a participant. */
export function withoutZeroShares(shares: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(shares).filter(([, cents]) => cents > 0));
}
