import { byListOrder } from "./members";
import type { Expense } from "./types";

/**
 * BAL-1: balance = paid − shares, in whole cents; positive = gets back. Ids in expenses that are no longer
 * members (a race, see data-model) are kept so the total still sums to zero.
 */
export function balances(memberIds: string[], expenses: Expense[]): Map<string, number> {
  const out = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const add = (id: string, cents: number) => out.set(id, (out.get(id) ?? 0) + cents);
  for (const e of expenses) {
    add(e.payerId, e.amountCents);
    for (const [id, share] of Object.entries(e.shares)) add(id, -share);
  }
  return out;
}

/**
 * BAL-1: the rules can't check that shares add up (data-model), so an expense written by a buggy client is
 * ignored rather than breaking everyone's balances.
 */
export function isWellFormed(e: Expense): boolean {
  const shares = Object.values(e.shares ?? {});
  return (
    Number.isInteger(e.amountCents) &&
    e.amountCents > 0 &&
    shares.length > 0 &&
    shares.every((s) => Number.isInteger(s) && s > 0) &&
    shares.reduce((a, b) => a + b, 0) === e.amountCents
  );
}

export type Payment = { from: string; to: string; cents: number };

/**
 * BAL-3: repeatedly the member who owes the most pays the member owed the most the smaller of the two
 * amounts. Ties go to the earlier id in `order` (member order), so results are stable.
 */
export function settlements(balance: Map<string, number>, order: string[]): Payment[] {
  const ids = [...order, ...[...balance.keys()].filter((id) => !order.includes(id))];
  const b = new Map(ids.map((id) => [id, balance.get(id) ?? 0]));
  const out: Payment[] = [];
  // At most one payment per member settles everyone; the cap also guards against balances not summing to 0.
  for (let step = 0; step < ids.length; step++) {
    const open = ids.filter((id) => b.get(id) !== 0);
    if (open.length === 0) return out;
    const debtor = open.reduce((a, x) => (b.get(x)! < b.get(a)! ? x : a));
    const creditor = open.reduce((a, x) => (b.get(x)! > b.get(a)! ? x : a));
    const cents = Math.min(-b.get(debtor)!, b.get(creditor)!);
    out.push({ from: debtor, to: creditor, cents });
    b.set(debtor, b.get(debtor)! + cents);
    b.set(creditor, b.get(creditor)! - cents);
  }
  return out;
}

export const totalSpent = (expenses: Expense[]) => expenses.reduce((sum, e) => sum + e.amountCents, 0);

/** BAL-8: suggested payments shown in the MEM-6 list order of the payer, then of the receiver. */
export function paymentsInListOrder(
  balance: Map<string, number>,
  order: string[],
  listed: string[],
): Payment[] {
  const by = byListOrder(listed);
  return settlements(balance, order).sort((a, b) => by(a.from, b.from) || by(a.to, b.to));
}

/** The Balances tab and the PDF: balances, suggested payments (BAL-8) and the balance rows in the MEM-6
 * order with former members after (BAL-6). `order` = stored member order, `listed` = MEM-6 order. */
export function settle(order: string[], expenses: Expense[], listed: string[]) {
  const bal = balances(order, expenses);
  return {
    bal,
    pays: paymentsInListOrder(bal, order, listed),
    rows: [...bal.keys()].sort(byListOrder(listed)),
  };
}
