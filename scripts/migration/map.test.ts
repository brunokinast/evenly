import { describe, expect, it } from "vitest";
import { planMigration, relinkTrip, type Backup, type DocNode, type Value } from "./map";

const ts = (ms: number): Value => ({ __type: "timestamp", ms });
const doc = (data: Record<string, Value> | null, collections: DocNode["collections"] = {}): DocNode => ({
  data,
  collections,
});

/** Old shape (specs/migration-source.md): owner Ana, app user Bia, guest Caio, one member with no name. */
function backup(): Backup {
  return {
    projectId: "test",
    takenAt: 9_000,
    collections: {
      users: { ana: doc({ displayName: "Ana" }), bia: doc({ displayName: " Bia " }) },
      trips: {
        t1: doc(
          {
            title: "Rio",
            currency: "BRL",
            ownerUid: "ana",
            iconName: "beach",
            inviteCode: "123456",
            inviteCodeActive: true,
            createdAt: ts(1_000),
          },
          {
            members: {
              m1: doc({ uid: "ana", createdAt: ts(1_000) }),
              m2: doc({ uid: "bia", createdAt: ts(2_000) }),
              m3: doc({ manualName: "Caio", createdAt: ts(3_000) }),
              m4: doc({ createdAt: ts(4_000) }),
            },
            expenses: {
              e1: doc({
                amount_cents: 1000,
                description: "Lunch",
                payer_member_id: "m2",
                participant_member_ids: ["m3", "m1", "m2"],
                createdByUid: "bia",
                createdAt: ts(5_000),
              }),
              e2: doc({
                amount_cents: 500,
                description: "Taxi",
                payer_member_id: "m1",
                participant_member_ids: ["m4", "m3"],
                createdByUid: "ana",
                createdAt: ts(6_000),
              }),
            },
          },
        ),
        empty: doc(
          { title: "Nothing", currency: "USD", ownerUid: "ana", createdAt: ts(1_000) },
          {
            members: { x: doc({ uid: "ana", createdAt: ts(1_000) }) },
          },
        ),
      },
    },
  };
}

describe("migration", () => {
  it("drops trips with no expenses and keeps trips with expenses", () => {
    const plan = planMigration(backup());
    expect(plan.keep.map((k) => k.id)).toEqual(["t1"]);
    expect(plan.drop).toEqual([{ id: "empty", name: "Nothing", reason: "no expenses" }]);
  });

  it("maps the trip and keeps member ids, old uids and names", () => {
    const { trip, leftovers } = planMigration(backup()).keep[0]!;
    expect(trip).toEqual({
      name: "Rio",
      icon: "beach",
      currency: "BRL",
      ownerUid: "ana",
      createdAt: 1_000,
      members: {
        m1: { name: "Ana", uid: "ana", joinedAt: 1_000 },
        m2: { name: "Bia", uid: "bia", joinedAt: 2_000 },
        m3: { name: "Caio", joinedAt: 3_000 },
        m4: { name: "Unknown", joinedAt: 4_000 },
      },
      memberIdsByUid: { ana: "m1", bia: "m2" },
      memberUids: ["ana", "bia"],
      invite: null,
    });
    expect(leftovers).toEqual(["members/m1", "members/m2", "members/m3", "members/m4"]);
  });

  it("BAL-2 makes equal shares in member order, leftover to the payer, dated from createdAt", () => {
    const { expenses } = planMigration(backup()).keep[0]!;
    expect(expenses.e1).toEqual({
      description: "Lunch",
      amountCents: 1000,
      payerId: "m2",
      shares: { m1: 333, m2: 334, m3: 333 },
      split: "equal",
      spentAt: 5_000,
      createdBy: "bia",
      createdAt: 5_000,
      updatedAt: 5_000,
    });
    expect(expenses.e2!.shares).toEqual({ m3: 250, m4: 250 });
  });

  it("balances match the old ones within the rounding cents", () => {
    const { check } = planMigration(backup()).keep[0]!;
    expect(check.every((c) => c.ok)).toBe(true);
    expect(check.find((c) => c.memberId === "m2")!.new).toBe(1000 - 334);
    expect(check.reduce((s, c) => s + c.new, 0)).toBe(0);
  });

  it("adds missing members as guests and an unknown icon falls back to luggage", () => {
    const b = backup();
    const t1 = b.collections.trips!.t1!;
    t1.data!.iconName = "rocket";
    delete t1.collections.members!.m3;
    const plan = planMigration(b);
    const { trip } = plan.keep[0]!;
    expect(trip.icon).toBe("luggage");
    expect(trip.members.m3).toEqual({ name: "Unknown", joinedAt: 1_000 });
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it("leaves trips already in the new shape alone", () => {
    const b = backup();
    b.collections.trips!.new = doc({ name: "New", memberUids: ["x"], members: {} });
    expect(planMigration(b).alreadyNew).toEqual(["new"]);
  });
});

describe("relink", () => {
  const trip = () => planMigration(backup()).keep[0]!.trip;

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

  it("refuses when the new identity is already a member", () => {
    expect(() => relinkTrip(trip(), {}, "ana", "bia", undefined)).toThrow(/already a member/);
  });
});
