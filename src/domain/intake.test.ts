import { describe, expect, it } from "vitest";
import { bestMatch, matchScore, parseAmount, parseTitle, readEvent, type IntakeEvent } from "./intake";
import type { Trip } from "./types";

function trip(id: string, name: string, people: string[], activeAt = 0): Trip {
  const members = people.map((n, i) => ({
    id: `${id}-${i}`,
    name: n,
    ...(i === 0 && { uid: "me" }),
    joinedAt: i,
  }));
  return {
    id,
    name,
    icon: "luggage",
    currency: "EUR",
    ownerUid: "me",
    createdAt: 0,
    activeAt,
    members,
    memberIdsByUid: { me: `${id}-0` },
    invite: null,
  };
}

// Home's order (TRIP-12): Lisbon is the most recently active.
const lisbon = trip("lis", "Lisbon", ["Bruno", "Ana", "Bia", "Ana Paula"], 3);
const rio = trip("rio", "Rio with the girls", ["Bruno", "Carol", "Duda"], 2);
const trips = [lisbon, rio];
const NOW = Date.UTC(2026, 10, 13, 20, 0);
const opts = { now: NOW, fallbackDescription: "Expense" };
const ev = (title: string, extra: Partial<IntakeEvent> = {}): IntakeEvent => ({
  id: "e1",
  title,
  start: NOW - 60_000,
  allDay: false,
  ...extra,
});
const read = (title: string, extra?: Partial<IntakeEvent>) => readEvent(ev(title, extra), trips, "me", opts)!;

describe("parseAmount", () => {
  it("AST-4 reads whole numbers, either decimal mark, and thousands", () => {
    expect(parseAmount("32")).toBe(3200);
    expect(parseAmount("32.50")).toBe(3250);
    expect(parseAmount("32,5")).toBe(3250);
    expect(parseAmount("1.234,56")).toBe(123456);
    expect(parseAmount("1,234.56")).toBe(123456);
    expect(parseAmount("1.234")).toBe(123400);
    expect(parseAmount("R$ 18,50")).toBe(1850);
  });

  it("AST-4 no number, zero or too much is no amount", () => {
    expect(parseAmount("museum")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("999999999999")).toBeNull();
  });
});

describe("parseTitle", () => {
  it("AST-2 splits amount | what | split with | trip | paid by; empty parts are not said", () => {
    expect(parseTitle("25 | taxi | Ana, Bia | | ")).toEqual({
      cents: 2500,
      what: "taxi",
      people: ["Ana", "Bia"],
      trip: null,
      payer: null,
    });
    expect(parseTitle("18,50 | açaí | | rio | Carla")).toMatchObject({ trip: "rio", payer: "Carla" });
  });

  it("AST-4 names may be joined with 'and', 'e' or 'com'", () => {
    expect(parseTitle("10 | x | Ana e Bia and Carol | |").people).toEqual(["Ana", "Bia", "Carol"]);
  });

  it("AST-4 a title without | : the first number is the amount, the rest what it was for", () => {
    expect(parseTitle("uber 32 reais dividido com a Ana")).toMatchObject({
      cents: 3200,
      what: "uber dividido com a Ana",
      people: null,
    });
    expect(parseTitle("Evenly, Taxi 25 dollars")).toMatchObject({ cents: 2500, what: "Taxi" });
  });
});

describe("matching", () => {
  it("AST-5 ignores capitals, accents and extra words, and tolerates small misspellings", () => {
    expect(bestMatch("lisboa", trips, (t) => t.name)).toEqual({ item: lisbon, guess: false });
    expect(bestMatch("the Lisbon trip", trips, (t) => t.name)).toEqual({ item: lisbon, guess: false });
    expect(bestMatch("RIO", trips, (t) => t.name)?.item).toBe(rio);
    expect(matchScore("Joao", "João")).toBe(1);
  });

  it("AST-5 a weak or nearly tied match is a guess", () => {
    const names = lisbon.members;
    expect(bestMatch("bea", names, (m) => m.name)).toEqual({ item: names[2], guess: true });
    expect(bestMatch("Ana", names, (m) => m.name)).toMatchObject({ item: names[1] });
    expect(bestMatch("Bia", names, (m) => m.name)).toEqual({ item: names[2], guess: false });
  });
});

describe("readEvent", () => {
  it("AST-4 defaults: the most recently active trip, paid by me, split between everyone, at the event time", () => {
    const p = read("60 | dinner | | |");
    expect(p.tripId).toBe("lis");
    expect(p.draft).toMatchObject({
      cents: 6000,
      description: "dinner",
      payerId: "lis-0",
      parts: ["lis-0", "lis-1", "lis-2", "lis-3"],
      spentAt: NOW - 60_000,
    });
    expect(p.guesses).toEqual([]);
  });

  it("AST-4 split with the named people plus me; 'all' and 'todos' mean everyone", () => {
    expect(read("25 | taxi | Bia | |").draft.parts).toEqual(["lis-0", "lis-2"]);
    expect(read("25 | taxi | todos | |").draft.parts).toHaveLength(4);
    expect(read("25 | taxi | eu, Ana | |").draft.parts).toEqual(["lis-0", "lis-1"]);
  });

  it("AST-4 a named trip and payer; AST-5 weak matches are marked as guesses", () => {
    const p = read("18,50 | açaí | | rio | Carla");
    expect(p.tripId).toBe("rio");
    expect(p.draft.payerId).toBe("rio-1");
    expect(p.guesses).toEqual(["payer"]);
    expect(read("25 | taxi | bea | |").guesses).toEqual(["split"]);
  });

  it("AST-4 empty description falls back; no amount stays missing", () => {
    const p = read(" | | | |");
    expect(p.draft.description).toBe("Expense");
    expect(p.draft.cents).toBeNull();
  });

  it("AST-4 never in the future; an all-day event means noon that day", () => {
    expect(read("1 | x | | |", { start: NOW + 3_600_000 }).draft.spentAt).toBe(NOW);
    const day = Date.UTC(2026, 10, 12);
    expect(read("1 | x | | |", { start: day, allDay: true }).draft.spentAt).toBe(
      new Date(2026, 10, 12, 12).getTime(),
    );
  });

  it("AST-4 nothing to add to without a trip", () => {
    expect(readEvent(ev("1 | x | | |"), [], "me", opts)).toBeNull();
  });
});
