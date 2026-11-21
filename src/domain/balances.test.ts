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

  const settles = (b: Map<string, number>, pays: { from: string; to: string; cents: number }[]) => {
    const after = new Map(b);
    for (const p of pays) {
      expect(p.cents).toBeGreaterThan(0);
      after.set(p.from, after.get(p.from)! + p.cents);
      after.set(p.to, after.get(p.to)! - p.cents);
    }
    return [...after.values()].every((v) => v === 0);
  };

  it("BAL-3 debts pass through no one: I owe A, A owes B → I pay B", () => {
    const b = new Map([["me", -5000], ["A", 0], ["B", 5000]]);
    expect(settlements(b, ["me", "A", "B"])).toEqual([{ from: "me", to: "B", cents: 5000 }]);
  });

  it("BAL-9 worked example: groups that sum to zero settle on their own", () => {
    const ids = ["A", "B", "C", "D", "E"];
    const b = new Map([["A", 40000], ["B", 30000], ["C", 20000], ["D", -40000], ["E", -50000]]);
    const pays = settlements(b, ids);
    expect(pays).toHaveLength(3);
    expect(pays).toEqual(
      expect.arrayContaining([
        { from: "D", to: "A", cents: 40000 },
        { from: "E", to: "B", cents: 30000 },
        { from: "E", to: "C", cents: 20000 },
      ]),
    );
  });

  it("BAL-3 always the fewest payments (checked against every way to split the group)", () => {
    // Fewest = non-zero members − the most zero-sum groups they can be split into (brute force here).
    const mostGroups = (vals: number[]): number => {
      if (vals.length === 0) return 0;
      const [first = 0, ...rest] = vals;
      let best = 0;
      for (let mask = 0; mask < 1 << rest.length; mask++) {
        const inGroup = rest.filter((_, i) => mask & (1 << i));
        if (first + inGroup.reduce((a, x) => a + x, 0) !== 0) continue;
        best = Math.max(best, 1 + mostGroups(rest.filter((_, i) => !(mask & (1 << i)))));
      }
      return best;
    };
    let seed = 7;
    const rand = (n: number) => (seed = (seed * 16807) % 2147483647) % n;
    for (let round = 0; round < 300; round++) {
      const ids = Array.from({ length: 2 + rand(7) }, (_, i) => `m${i}`);
      // Small whole amounts, so zero-sum groups are common.
      const vals = ids.slice(1).map(() => (rand(9) - 4) * 1000);
      vals.unshift(-vals.reduce((a, x) => a + x, 0));
      const b = new Map(ids.map((id, i) => [id, vals[i]!]));
      const pays = settlements(b, ids);
      expect(settles(b, pays)).toBe(true);
      const nonZero = vals.filter((v) => v !== 0);
      expect(pays.length).toBe(nonZero.length - mostGroups(nonZero));
    }
  });

  it("BAL-3 past 15 people owing or owed: one group, still settled, quickly", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `m${i}`);
    const vals = ids.map((_, i) => (i % 2 ? 1 : -1) * (100 + i));
    vals[29]! -= vals.reduce((a, x) => a + x, 0);
    const b = new Map(ids.map((id, i) => [id, vals[i]!]));
    const start = performance.now();
    const pays = settlements(b, ids);
    expect(performance.now() - start).toBeLessThan(50);
    expect(settles(b, pays)).toBe(true);
    expect(pays.length).toBeLessThanOrEqual(29);
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
