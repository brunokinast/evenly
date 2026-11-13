import { describe, expect, it } from "vitest";
import { checkDraft, draftInput, draftOf, newDraft, withCents, withTrip } from "./draft";
import type { Trip } from "./types";

function trip(id: string, ids: string[]): Trip {
  return {
    id,
    name: id,
    icon: "luggage",
    currency: "EUR",
    ownerUid: "me",
    createdAt: 0,
    members: ids.map((m, i) => ({ id: m, name: m, joinedAt: i })),
    memberIdsByUid: { me: ids[0]! },
    invite: null,
  };
}
const t = trip("t", ["A", "B", "C"]);

describe("draft", () => {
  it("EXP-10 a new draft is paid by me, split equally between all, dated now", () => {
    expect(newDraft(t, "A", 5)).toEqual({
      cents: null,
      description: "",
      payerId: "A",
      parts: ["A", "B", "C"],
      custom: false,
      typed: {},
      spentAt: 5,
    });
  });

  it("EXP-1 needs an amount, a description and someone to split with", () => {
    const d = { ...newDraft(t, "A", 0), cents: 900, description: " Dinner " };
    expect(checkDraft(t, d).valid).toBe(true);
    expect(checkDraft(t, { ...d, cents: null }).valid).toBe(false);
    expect(checkDraft(t, { ...d, description: "  " }).valid).toBe(false);
    expect(checkDraft(t, { ...d, parts: [] }).valid).toBe(false);
    expect(draftInput(t, d)).toEqual({
      description: "Dinner",
      amountCents: 900,
      payerId: "A",
      shares: { A: 300, B: 300, C: 300 },
      split: "equal",
      spentAt: 0,
    });
  });

  it("EXP-6 people who left the trip drop out of an edited expense", () => {
    const d = draftOf(t, "A", {
      id: "e",
      description: "x",
      amountCents: 100,
      payerId: "Z",
      shares: { A: 50, Z: 50 },
      split: "equal",
      spentAt: 0,
      createdBy: "me",
      createdAt: 0,
      updatedAt: 0,
    });
    expect(d.parts).toEqual(["A"]);
    expect(d.payerId).toBe("A");
  });

  it("EXP-13 a new total resets a custom split to equal", () => {
    const d = { ...newDraft(t, "A", 0), cents: 900, custom: true, typed: { B: 500 } };
    expect(withCents(d, 1000)).toMatchObject({ splitReset: true, draft: { custom: false, typed: {} } });
    expect(withCents(d, 900).splitReset).toBe(false);
  });

  it("AST-8 another trip keeps description, amount and time; payer and split go back to the defaults", () => {
    const other = trip("o", ["X", "Y"]);
    const d = { ...newDraft(t, "A", 7), cents: 900, description: "Taxi", payerId: "B", parts: ["A", "B"] };
    expect(withTrip(d, other, "X")).toEqual({ ...newDraft(other, "X", 7), cents: 900, description: "Taxi" });
  });
});
