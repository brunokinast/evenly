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

export type Payment = { from: string; to: string; cents: number };

/**
 * BAL-3: repeatedly the member who owes the most pays the member owed the most the smaller of the two
 * amounts. Ties go to the earlier id in `order` (member order), so results are stable.
 */
export function settlements(balance: Map<string, number>, order: string[]): Payment[] {
  const ids = [...order, ...[...balance.keys()].filter((id) => !order.includes(id))];
  const b = new Map(ids.map((id) => [id, balance.get(id) ?? 0]));
  const out: Payment[] = [];
  for (;;) {
    const open = ids.filter((id) => b.get(id) !== 0);
    if (open.length === 0) return out;
    const debtor = open.reduce((a, x) => (b.get(x)! < b.get(a)! ? x : a));
    const creditor = open.reduce((a, x) => (b.get(x)! > b.get(a)! ? x : a));
    const cents = Math.min(-b.get(debtor)!, b.get(creditor)!);
    out.push({ from: debtor, to: creditor, cents });
    b.set(debtor, b.get(debtor)! + cents);
    b.set(creditor, b.get(creditor)! - cents);
  }
}

export const totalSpent = (expenses: Expense[]) => expenses.reduce((sum, e) => sum + e.amountCents, 0);
