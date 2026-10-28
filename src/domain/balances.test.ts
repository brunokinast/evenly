import { describe, expect, it } from "vitest";
import { balances, isWellFormed, settlements } from "./balances";
import { equalShares } from "./split";
import type { Expense } from "./types";

const exp = (payerId: string, amountCents: number, participants: string[]): Expense => ({
  id: Math.random().toString(),
  description: "x",
  amountCents,
  payerId,
  shares: equalShares(amountCents, participants, payerId),
  split: "equal",
  spentAt: 0,
  createdBy: "u",
  createdAt: 0,
  updatedAt: 0,
});

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

describe("balances and settlements", () => {
  it("BAL-7 worked example", () => {
    const b = balances(["A", "B", "C"], [exp("A", 10000, ["A", "B", "C"])]);
    expect(Object.fromEntries(b)).toEqual({ A: 6666, B: -3333, C: -3333 });
    expect(settlements(b, ["A", "B", "C"])).toEqual([
      { from: "B", to: "A", cents: 3333 },
      { from: "C", to: "A", cents: 3333 },
    ]);
  });

  it("BAL-1 balances always sum to zero, in whole cents", () => {
    const ids = ["A", "B", "C", "D", "E"];
    const expenses = [
      exp("A", 10001, ids),
      exp("B", 777, ["A", "C"]),
      exp("E", 99999, ["B", "C", "D"]),
      exp("C", 1, ["D"]),
    ];
    const b = balances(ids, expenses);
    expect(sum(b)).toBe(0);
    for (const v of b.values()) expect(Number.isInteger(v)).toBe(true);
  });

  it("BAL-3 settles everyone with at most (non-zero members − 1) payments", () => {
    const ids = ["A", "B", "C", "D", "E", "F"];
    const expenses = [exp("A", 12000, ids), exp("B", 3000, ["C", "D"]), exp("F", 4550, ["A", "E"])];
    const b = balances(ids, expenses);
    const pays = settlements(b, ids);
    const nonZero = [...b.values()].filter((v) => v !== 0).length;
    expect(pays.length).toBeLessThanOrEqual(nonZero - 1);
    const after = new Map(b);
    for (const p of pays) {
      after.set(p.from, after.get(p.from)! + p.cents);
      after.set(p.to, after.get(p.to)! - p.cents);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
  });

  it("BAL-1 malformed expenses are detected, and settlements always end", () => {
    const bad = { ...exp("A", 500, ["A", "B"]), shares: { A: 1 } };
    expect(isWellFormed(exp("A", 500, ["A", "B"]))).toBe(true);
    expect(isWellFormed(bad)).toBe(false);
    expect(isWellFormed({ ...bad, shares: { A: 250.5, B: 249.5 } })).toBe(false);
    expect(settlements(balances(["A", "B"], [bad]), ["A", "B"]).length).toBeLessThanOrEqual(2);
  });

  it("BAL-3 nothing to pay when all are settled", () => {
    expect(settlements(balances(["A", "B"], []), ["A", "B"])).toEqual([]);
  });

  it("BAL-1 a former member still counts, so the total stays zero", () => {
    const b = balances(["A"], [exp("A", 1000, ["A", "gone"])]);
    expect(b.get("gone")).toBe(-500);
    expect(sum(b)).toBe(0);
  });
});
