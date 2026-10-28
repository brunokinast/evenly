import { describe, expect, it } from "vitest";
import { customShares, equalShares, withoutZeroShares } from "./split";

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe("equalShares", () => {
  it("BAL-7 A pays 100.00 for A, B, C → A 33.34, B 33.33, C 33.33", () => {
    expect(equalShares(10000, ["A", "B", "C"], "A")).toEqual({ A: 3334, B: 3333, C: 3333 });
  });

  it("BAL-2 leftover cents go to the first participant when the payer isn't in the split", () => {
    expect(equalShares(1000, ["B", "C", "D"], "A")).toEqual({ B: 334, C: 333, D: 333 });
  });

  it("BAL-2 shares always sum exactly to the amount", () => {
    for (const amount of [1, 2, 99, 1001, 99999, 1234567]) {
      for (let n = 1; n <= 7; n++) {
        const ids = Array.from({ length: n }, (_, i) => `m${i}`);
        expect(sum(equalShares(amount, ids, "m3"))).toBe(amount);
      }
    }
  });
});

describe("customShares", () => {
  it("EXP-12 typed amounts stay; the rest is split equally with BAL-2 leftovers", () => {
    const r = customShares(10000, ["A", "B", "C", "D"], { B: 4000 }, "A");
    expect(r.shares).toEqual({ A: 2000, B: 4000, C: 2000, D: 2000 });
    expect(r.auto).toEqual(["A", "C", "D"]);
    expect(r.remaining).toBe(0);
    expect(customShares(1000, ["A", "B", "C", "D"], { B: 0 }, "A").shares).toEqual({
      A: 334,
      B: 0,
      C: 333,
      D: 333,
    });
  });

  it("EXP-12 reports what's left to assign or how much it's over", () => {
    expect(customShares(10000, ["A", "B"], { A: 3000, B: 5000 }, "A").remaining).toBe(2000);
    expect(customShares(10000, ["A", "B"], { A: 7000 }, "A")).toMatchObject({ remaining: 0 });
    expect(customShares(10000, ["A", "B", "C"], { A: 7000, B: 5000 }, "A").remaining).toBe(-2000);
    expect(customShares(10000, ["A", "B"], { A: 7000, B: 5000 }, "A").remaining).toBe(-2000);
  });

  it("EXP-12 a participant whose share is 0 is not a participant", () => {
    expect(withoutZeroShares({ A: 1000, B: 0 })).toEqual({ A: 1000 });
  });
});
