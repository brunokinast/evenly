import { describe, expect, it } from "vitest";
import {
  byListOrder,
  checkGuestName,
  checkTripName,
  listOrder,
  people,
  person,
  sortMembers,
} from "./members";
import type { Member, Trip } from "./types";

const trip = (members: Member[], ownerUid = "u1"): Trip => ({
  id: "t",
  name: "Trip",
  icon: "luggage",
  currency: "USD",
  ownerUid,
  createdAt: 0,
  members,
  memberIdsByUid: {},
  invite: null,
});

describe("members", () => {
  it("MEM-6 lists members in join order", () => {
    const m = sortMembers([
      { id: "b", name: "B", joinedAt: 20 },
      { id: "a", name: "A", uid: "u1", joinedAt: 10 },
    ]);
    expect(m.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("MEM-6 lists me first on screen, then everyone else in join order", () => {
    expect(listOrder(["a", "b", "c", "d"], "c")).toEqual(["c", "a", "b", "d"]);
    expect(listOrder(["a", "b"], "")).toEqual(["a", "b"]);
  });

  it("MEM-6 sorts other ids by that order, former members last", () => {
    const order = listOrder(["a", "b", "c"], "b");
    expect(["x", "c", "a", "b"].sort(byListOrder(order))).toEqual(["b", "a", "c", "x"]);
  });

  it("MEM-4 tells same names apart: me stays plain, the guest tag, else a number in join order", () => {
    const p = people(
      trip([
        { id: "a", name: "Ana", uid: "u1", joinedAt: 1 },
        { id: "b", name: "ana", uid: "u2", joinedAt: 2 },
        { id: "c", name: "Ana", joinedAt: 3 },
        { id: "d", name: "Bia", joinedAt: 4 },
        { id: "e", name: "Ana", uid: "u3", joinedAt: 5 },
        { id: "f", name: "ANA", joinedAt: 6 },
      ]),
      "u1",
    );
    expect(p.get("a")).toMatchObject({ name: "Ana", me: true, owner: true, guest: false });
    expect(p.get("b")).toMatchObject({ name: "ana", me: false });
    expect(p.get("c")).toMatchObject({ name: "Ana", guest: true });
    expect(p.get("d")?.name).toBe("Bia");
    expect(p.get("e")?.name).toBe("Ana (2)");
    expect(p.get("f")).toMatchObject({ name: "ANA (2)", guest: true });
  });

  it("MEM-5 an id no longer in the trip shows as a former member", () => {
    const p = people(trip([]), "u1");
    expect(person(p, "zz", "Former member")).toMatchObject({ name: "Former member", former: true });
  });

  it("MEM-2 guest names are trimmed, required and unique among guests (case-insensitive)", () => {
    const members: Member[] = [
      { id: "a", name: "Ana", uid: "u1", joinedAt: 1 },
      { id: "g", name: "Tom", joinedAt: 2 },
    ];
    expect(checkGuestName("  Rita ", members)).toEqual({ ok: true, name: "Rita" });
    expect(checkGuestName("  ", members)).toEqual({ ok: false, error: "empty" });
    expect(checkGuestName("tom", members)).toEqual({ ok: false, error: "taken" });
    expect(checkGuestName("ana", members)).toEqual({ ok: true, name: "ana" });
    expect(checkGuestName("x".repeat(51), members)).toEqual({ ok: false, error: "tooLong" });
  });

  it("TRIP-2 trip names are trimmed and required", () => {
    expect(checkTripName(" Lisbon ")).toEqual({ ok: true, name: "Lisbon" });
    expect(checkTripName("   ")).toEqual({ ok: false, error: "empty" });
    expect(checkTripName("x".repeat(51))).toEqual({ ok: false, error: "tooLong" });
  });
});
