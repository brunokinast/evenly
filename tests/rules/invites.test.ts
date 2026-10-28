import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { arrayRemove, arrayUnion, deleteField, doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { as, HOUR, rulesEnv, seed, tripDoc } from "./env";

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await rulesEnv();
});
afterAll(() => env.cleanup());

const CODE = "482913";

/** Trip t1 with a valid invite CODE and its invite doc. */
async function seedInvite(expiresAt = Date.now() + HOUR) {
  await seed(env, {
    "trips/t1": { ...tripDoc(), invite: { code: CODE, expiresAt } },
    [`invites/${CODE}`]: {
      tripId: "t1",
      expiresAt,
      name: "Lisbon",
      icon: "flight",
      currency: "EUR",
      guests: { mg: "Gus" },
    },
  });
}

const attempt = (count = 1, windowStart = Date.now()) => ({ code: CODE, count, windowStart });

beforeEach(async () => {
  await env.clearFirestore();
});

describe("create invite (INV-1, INV-2, INV-8, INV-10)", () => {
  async function createInvite(uid: string, code: string, previous?: string) {
    const db = as(env, uid);
    const expiresAt = Date.now() + HOUR;
    const batch = writeBatch(db);
    batch.set(doc(db, `invites/${code}`), {
      tripId: "t1",
      expiresAt,
      name: "Lisbon",
      icon: "flight",
      currency: "EUR",
      guests: { mg: "Gus" },
    });
    if (previous) batch.delete(doc(db, `invites/${previous}`));
    batch.update(doc(db, "trips/t1"), { invite: { code, expiresAt } });
    return batch.commit();
  }

  it("INV-10 only the owner creates a code", async () => {
    await seed(env, { "trips/t1": tripDoc() });
    await assertFails(createInvite("bob", CODE));
    await assertSucceeds(createInvite("alice", CODE));
  });

  it("INV-8 a new code replaces the previous one", async () => {
    await seedInvite();
    await assertSucceeds(createInvite("alice", "111111", CODE));
  });

  it("INV-1 a code in use by another trip can't be taken", async () => {
    await seedInvite();
    await seed(env, { "trips/t2": { ...tripDoc(), name: "Other", ownerUid: "alice" } });
    const db = as(env, "alice");
    const batch = writeBatch(db);
    const expiresAt = Date.now() + HOUR;
    batch.set(doc(db, `invites/${CODE}`), {
      tripId: "t2",
      expiresAt,
      name: "Other",
      icon: "flight",
      currency: "EUR",
      guests: {},
    });
    batch.update(doc(db, "trips/t2"), { invite: { code: CODE, expiresAt } });
    await assertFails(batch.commit());
  });

  it("INV-2 an expired code can be reused", async () => {
    await seedInvite(Date.now() - 1000);
    await assertSucceeds(createInvite("alice", CODE));
  });

  it("INV-2 the invite must expire in 1 hour and copy the trip's preview fields", async () => {
    await seed(env, { "trips/t1": tripDoc() });
    const db = as(env, "alice");
    const batch = writeBatch(db);
    const expiresAt = Date.now() + 24 * HOUR;
    batch.set(doc(db, `invites/${CODE}`), {
      tripId: "t1",
      expiresAt,
      name: "Lisbon",
      icon: "flight",
      currency: "EUR",
      guests: {},
    });
    batch.update(doc(db, "trips/t1"), { invite: { code: CODE, expiresAt } });
    await assertFails(batch.commit());
  });
});

describe("look up a code (INV-5, INV-9)", () => {
  it("INV-5 a non-member reads an invite only after recording an attempt with that code", async () => {
    await seedInvite();
    const db = as(env, "eve");
    await assertFails(getDoc(doc(db, `invites/${CODE}`)));
    await assertSucceeds(setDoc(doc(db, "joinAttempts/eve"), attempt()));
    await assertSucceeds(getDoc(doc(db, `invites/${CODE}`)));
    await assertFails(getDoc(doc(db, "trips/t1")));
    await assertFails(getDoc(doc(db, "invites/000000")));
  });

  it("INV-9 at most 10 attempts per 15 minutes, each counted", async () => {
    const db = as(env, "eve");
    const start = Date.now();
    await assertSucceeds(setDoc(doc(db, "joinAttempts/eve"), attempt(1, start)));
    await assertFails(setDoc(doc(db, "joinAttempts/eve"), attempt(1, start)));
    await assertFails(setDoc(doc(db, "joinAttempts/eve"), attempt(3, start)));
    await seed(env, { "joinAttempts/eve": attempt(10, start) });
    await assertFails(setDoc(doc(db, "joinAttempts/eve"), attempt(11, start)));
    await assertFails(setDoc(doc(as(env, "mallory"), "joinAttempts/eve"), attempt(1)));
  });

  it("INV-9 a new window starts after 15 minutes", async () => {
    const old = Date.now() - 16 * 60_000;
    await seed(env, { "joinAttempts/eve": attempt(10, old) });
    await assertSucceeds(setDoc(doc(as(env, "eve"), "joinAttempts/eve"), attempt(1)));
  });
});

describe("join (INV-6, INV-7, MEM-7, INV-11)", () => {
  const joinNew = (uid: string, mid = "me1") => ({
    memberUids: arrayUnion(uid),
    [`memberIdsByUid.${uid}`]: mid,
    [`members.${mid}`]: { name: "Eve", uid, joinedAt: Date.now() },
  });

  async function join(uid: string, update: object, claim?: string) {
    const db = as(env, uid);
    const batch = writeBatch(db);
    batch.update(doc(db, "trips/t1"), update);
    if (claim) batch.update(doc(db, `invites/${CODE}`), { [`guests.${claim}`]: deleteField() });
    return batch.commit();
  }

  it("INV-6 a user with the valid code joins as a new member", async () => {
    await seedInvite();
    await seed(env, { "joinAttempts/eve": attempt() });
    await assertSucceeds(join("eve", joinNew("eve")));
  });

  it("INV-5 joining needs a recorded attempt with the trip's code", async () => {
    await seedInvite();
    await assertFails(join("eve", joinNew("eve")));
    await seed(env, { "joinAttempts/eve": { ...attempt(), code: "000000" } });
    await assertFails(join("eve", joinNew("eve")));
  });

  it("INV-4 an expired or replaced code can't be used", async () => {
    await seedInvite(Date.now() - 1000);
    await seed(env, { "joinAttempts/eve": attempt() });
    await assertFails(join("eve", joinNew("eve")));
  });

  it("INV-7 a current member can't join again", async () => {
    await seedInvite();
    await seed(env, { "joinAttempts/bob": attempt() });
    await assertFails(join("bob", joinNew("bob", "mb2")));
  });

  it("MEM-7 claiming a guest takes over its entry and removes it from the invite", async () => {
    await seedInvite();
    await seed(env, { "joinAttempts/eve": attempt() });
    await assertSucceeds(
      join(
        "eve",
        {
          memberUids: arrayUnion("eve"),
          "memberIdsByUid.eve": "mg",
          "members.mg.uid": "eve",
          "members.mg.name": "Eve",
        },
        "mg",
      ),
    );
  });

  it("MEM-7 an app user's entry can't be claimed", async () => {
    await seedInvite();
    await seed(env, { "joinAttempts/eve": attempt() });
    await assertFails(
      join("eve", {
        memberUids: arrayUnion("eve"),
        "memberIdsByUid.eve": "mb",
        "members.mb.uid": "eve",
      }),
    );
  });

  it("a joiner can't change anything else", async () => {
    await seedInvite();
    await seed(env, { "joinAttempts/eve": attempt() });
    await assertFails(join("eve", { ...joinNew("eve"), name: "Mine" }));
    await assertFails(join("eve", { ...joinNew("eve"), "members.ma.name": "x" }));
  });

  it("INV-11 a user who left can rejoin and claim their old place back", async () => {
    await seedInvite();
    await seed(env, { "joinAttempts/bob": attempt() });
    const bob = as(env, "bob");
    const leave = writeBatch(bob);
    leave.update(doc(bob, "trips/t1"), {
      memberUids: arrayRemove("bob"),
      "memberIdsByUid.bob": deleteField(),
      "members.mb.uid": deleteField(),
    });
    leave.update(doc(bob, `invites/${CODE}`), { "guests.mb": "Bob" });
    await assertSucceeds(leave.commit());
    await assertSucceeds(
      join(
        "bob",
        { memberUids: arrayUnion("bob"), "memberIdsByUid.bob": "mb", "members.mb.uid": "bob" },
        "mb",
      ),
    );
  });
});

describe("invite upkeep", () => {
  it("only the owner edits or deletes an invite's synced fields", async () => {
    await seedInvite();
    const alice = as(env, "alice");
    const bob = as(env, "bob");
    await assertFails(
      writeBatch(bob)
        .update(doc(bob, `invites/${CODE}`), { name: "L" })
        .commit(),
    );
    await assertSucceeds(
      writeBatch(alice)
        .update(doc(alice, `invites/${CODE}`), { name: "L" })
        .commit(),
    );
    await assertFails(
      writeBatch(bob)
        .delete(doc(bob, `invites/${CODE}`))
        .commit(),
    );
    await assertSucceeds(
      writeBatch(alice)
        .delete(doc(alice, `invites/${CODE}`))
        .commit(),
    );
  });

  it("a leaver can add only their own guest entry", async () => {
    await seedInvite();
    const bob = as(env, "bob");
    const batch = writeBatch(bob);
    batch.update(doc(bob, "trips/t1"), {
      memberUids: arrayRemove("bob"),
      "memberIdsByUid.bob": deleteField(),
      "members.mb.uid": deleteField(),
    });
    batch.update(doc(bob, `invites/${CODE}`), { "guests.mb": "Bob", "guests.mx": "X" });
    await assertFails(batch.commit());
  });
});
