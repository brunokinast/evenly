import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { as, expenseDoc, rulesEnv, seed, tripDoc } from "./env";

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await rulesEnv();
});
afterAll(() => env.cleanup());
let seeded: ReturnType<typeof expenseDoc>;
beforeEach(async () => {
  await env.clearFirestore();
  seeded = expenseDoc();
  await seed(env, { "trips/t1": tripDoc(), "trips/t1/expenses/e1": seeded });
});

function newTrip(uid: string, now = Date.now()) {
  return {
    name: "Serra",
    icon: "camping",
    currency: "BRL",
    ownerUid: uid,
    createdAt: now,
    members: { m1: { name: "Ana", uid, joinedAt: now } },
    memberIdsByUid: { [uid]: "m1" },
    memberUids: [uid],
    invite: null,
  };
}

describe("trips: read (TRIP-8, TRIP-5)", () => {
  it("TRIP-8 members can read a trip; others and signed-out users can't", async () => {
    await assertSucceeds(getDoc(doc(as(env, "bob"), "trips/t1")));
    await assertFails(getDoc(doc(as(env, "eve"), "trips/t1")));
    await assertFails(getDoc(doc(as(env, null), "trips/t1")));
  });

  it("TRIP-5 Home's query returns only my trips; listing all trips is denied (KI-1, KI-4)", async () => {
    const db = as(env, "bob");
    await assertSucceeds(
      getDocs(query(collection(db, "trips"), where("memberUids", "array-contains", "bob"))),
    );
    await assertFails(getDocs(collection(db, "trips")));
  });
});

describe("trips: create (TRIP-1)", () => {
  it("TRIP-1 a user creates a trip as its owner and only member", async () => {
    await assertSucceeds(setDoc(doc(as(env, "carl"), "trips/t2"), newTrip("carl")));
  });

  it("rejects a trip owned by someone else, with extra members, an invite or bad fields", async () => {
    const db = as(env, "carl");
    await assertFails(setDoc(doc(db, "trips/t2"), newTrip("dora")));
    await assertFails(setDoc(doc(db, "trips/t2"), { ...newTrip("carl"), memberUids: ["carl", "dora"] }));
    await assertFails(
      setDoc(doc(db, "trips/t2"), { ...newTrip("carl"), invite: { code: "123456", expiresAt: 1 } }),
    );
    await assertFails(setDoc(doc(db, "trips/t2"), { ...newTrip("carl"), name: "" }));
    await assertFails(setDoc(doc(db, "trips/t2"), { ...newTrip("carl"), currency: "JPY" }));
    await assertFails(setDoc(doc(db, "trips/t2"), { ...newTrip("carl"), icon: "rocket" }));
    await assertFails(setDoc(doc(db, "trips/t2"), { ...newTrip("carl"), createdAt: 5 }));
    await assertFails(setDoc(doc(db, "trips/t2"), { ...newTrip("carl"), extra: true }));
  });
});

describe("trips: owner edits (TRIP-6, TRIP-11, MEM-1, MEM-5)", () => {
  it("TRIP-11 the owner renames; a member can't (TRIP-6)", async () => {
    await assertSucceeds(updateDoc(doc(as(env, "alice"), "trips/t1"), { name: "Lisboa" }));
    await assertFails(updateDoc(doc(as(env, "bob"), "trips/t1"), { name: "Mine now" }));
  });

  it("MEM-1 the owner adds a guest; a member can't", async () => {
    const guest = (name: string) => ({ "members.mh": { name, joinedAt: Date.now() } });
    await assertFails(updateDoc(doc(as(env, "bob"), "trips/t1"), guest("Hana")));
    await assertSucceeds(updateDoc(doc(as(env, "alice"), "trips/t1"), guest("Hana")));
  });

  it("MEM-5 the owner removes an app user, who stays as a guest", async () => {
    await assertSucceeds(
      updateDoc(doc(as(env, "alice"), "trips/t1"), {
        memberUids: arrayRemove("bob"),
        "memberIdsByUid.bob": deleteField(),
        "members.mb.uid": deleteField(),
      }),
    );
  });

  it("the owner can't add users directly or remove themselves; the currency is fixed (TRIP-3)", async () => {
    const db = as(env, "alice");
    await assertFails(
      updateDoc(doc(db, "trips/t1"), { memberUids: ["alice", "bob", "eve"], "memberIdsByUid.eve": "me" }),
    );
    await assertFails(
      updateDoc(doc(db, "trips/t1"), {
        memberUids: arrayRemove("alice"),
        "memberIdsByUid.alice": deleteField(),
      }),
    );
    await assertFails(updateDoc(doc(db, "trips/t1"), { currency: "USD" }));
    await assertFails(updateDoc(doc(db, "trips/t1"), { ownerUid: "bob" }));
  });
});

describe("trips: members' own changes (ID-5, MEM-5, MEM-8)", () => {
  it("ID-5 a member renames only their own entry", async () => {
    await assertSucceeds(updateDoc(doc(as(env, "bob"), "trips/t1"), { "members.mb.name": "Robert" }));
    await assertFails(updateDoc(doc(as(env, "bob"), "trips/t1"), { "members.ma.name": "Al" }));
    await assertFails(updateDoc(doc(as(env, "bob"), "trips/t1"), { "members.mb.joinedAt": 1 }));
    await assertFails(updateDoc(doc(as(env, "eve"), "trips/t1"), { "members.mb.name": "Hacked" }));
  });

  const leave = (uid: string, mid: string) => ({
    memberUids: arrayRemove(uid),
    [`memberIdsByUid.${uid}`]: deleteField(),
    [`members.${mid}.uid`]: deleteField(),
  });

  it("MEM-5 a member leaves and stays as a guest", async () => {
    await assertSucceeds(updateDoc(doc(as(env, "bob"), "trips/t1"), leave("bob", "mb")));
  });

  it("MEM-8 the owner can't leave their own trip", async () => {
    await assertFails(updateDoc(doc(as(env, "alice"), "trips/t1"), leave("alice", "ma")));
  });

  it("MEM-5 leaving can't remove the entry or change anything else", async () => {
    await assertFails(
      updateDoc(doc(as(env, "bob"), "trips/t1"), {
        memberUids: arrayRemove("bob"),
        "memberIdsByUid.bob": deleteField(),
        "members.mb": deleteField(),
      }),
    );
    await assertFails(updateDoc(doc(as(env, "bob"), "trips/t1"), { ...leave("bob", "mb"), name: "x" }));
  });
});

describe("trips: delete (TRIP-7, KI-5)", () => {
  it("TRIP-7 only the owner deletes, atomically with its expenses", async () => {
    await assertFails(deleteDoc(doc(as(env, "bob"), "trips/t1")));
    const db = as(env, "alice");
    const batch = writeBatch(db);
    batch.delete(doc(db, "trips/t1/expenses/e1"));
    batch.delete(doc(db, "trips/t1"));
    await assertSucceeds(batch.commit());
  });
});

describe("expenses (EXP-1, EXP-3..6, TRIP-8, KI-6)", () => {
  const ref = (uid: string, id = "e2") => doc(as(env, uid), `trips/t1/expenses/${id}`);

  it("TRIP-8 only members read expenses", async () => {
    await assertSucceeds(getDocs(collection(as(env, "alice"), "trips/t1/expenses")));
    await assertFails(getDocs(collection(as(env, "eve"), "trips/t1/expenses")));
  });

  it("EXP-4 any member adds, edits and deletes any expense", async () => {
    await assertSucceeds(setDoc(ref("alice"), expenseDoc("alice")));
    await assertSucceeds(
      setDoc(ref("alice", "e1"), { ...seeded, description: "Lunch", updatedAt: Date.now() }),
    );
    await assertSucceeds(deleteDoc(ref("alice", "e1")));
    await assertFails(setDoc(ref("eve"), expenseDoc("eve")));
    await assertFails(deleteDoc(ref("eve", "e1")));
  });

  it("EXP-5 the payer doesn't have to be a participant", async () => {
    await assertSucceeds(setDoc(ref("bob"), { ...expenseDoc(), payerId: "ma", shares: { mb: 9000 } }));
  });

  it("EXP-6 payer and participants must be members", async () => {
    await assertFails(setDoc(ref("bob"), { ...expenseDoc(), payerId: "zz" }));
    await assertFails(setDoc(ref("bob"), { ...expenseDoc(), shares: { mb: 4500, zz: 4500 } }));
  });

  it("EXP-1 validates description, amount, shares, split and fields (KI-6)", async () => {
    const bad = [
      { description: "" },
      { description: "x".repeat(101) },
      { amountCents: 0 },
      { amountCents: 12.5 },
      { amountCents: 10_000_000_001 },
      { shares: {} },
      { split: "weird" },
      { createdBy: "alice" },
      { extra: 1 },
    ];
    for (const change of bad) await assertFails(setDoc(ref("bob"), { ...expenseDoc(), ...change }));
  });

  it("EXP-11 can't be dated in the future", async () => {
    await assertFails(setDoc(ref("bob"), { ...expenseDoc(), spentAt: Date.now() + 3_600_000 }));
  });

  it("edits keep the creator and creation time", async () => {
    await assertFails(setDoc(ref("alice", "e1"), { ...seeded, createdBy: "alice" }));
    await assertFails(setDoc(ref("alice", "e1"), { ...seeded, createdAt: 1 }));
  });
});
