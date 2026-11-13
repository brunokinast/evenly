import { describe, expect, it } from "vitest";
import { relinkTrip, type TripDoc } from "./trip";

const trip = (): TripDoc => ({
  name: "Rio",
  ownerUid: "ana",
  members: {
    m1: { name: "Ana", uid: "ana", joinedAt: 1_000 },
    m2: { name: "Bia", uid: "bia", joinedAt: 2_000 },
    m3: { name: "Caio", joinedAt: 3_000 },
  },
  memberIdsByUid: { ana: "m1", bia: "m2" },
  memberUids: ["ana", "bia"],
});

describe("relink", () => {
  it("moves the old uid's entry, ownership and createdBy to the new uid", () => {
    const { update, expenseIds } = relinkTrip(
      trip(),
      { e1: { createdBy: "bia" }, e2: { createdBy: "ana" } },
      "ana",
      "ana2",
      "Ana K",
    );
    expect(update.ownerUid).toBe("ana2");
    expect(update.members.m1).toEqual({ name: "Ana K", uid: "ana2", joinedAt: 1_000 });
    expect(update.memberIdsByUid).toEqual({ bia: "m2", ana2: "m1" });
    expect(update.memberUids).toEqual(["ana2", "bia"]);
    expect(expenseIds).toEqual(["e2"]);
  });

  it("keeps the old name when the new identity has none", () => {
    expect(relinkTrip(trip(), {}, "bia", "bia2", undefined).update.members.m2!.name).toBe("Bia");
  });

  it("refuses when the old uid isn't a member or the new one already is", () => {
    expect(() => relinkTrip(trip(), {}, "zed", "z2", undefined)).toThrow(/isn't a member/);
    expect(() => relinkTrip(trip(), {}, "ana", "bia", undefined)).toThrow(/already a member/);
  });
});
