import { readFileSync } from "node:fs";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, type Firestore } from "firebase/firestore";

/** Starts a rules test environment against the Firestore emulator (run via `npm run test:rules`). */
export function rulesEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: "demo-evenly-rules", // its own project: clearing it never touches the preview's data
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
}

export const HOUR = 3_600_000;

/** Trip "t1": alice (owner, member "ma"), bob (member "mb"), guest Gus ("mg"). */
export function tripDoc(now = Date.now()) {
  return {
    name: "Lisbon",
    icon: "flight",
    currency: "EUR",
    ownerUid: "alice",
    createdAt: now - 10_000,
    members: {
      ma: { name: "Alice", uid: "alice", joinedAt: now - 10_000 },
      mb: { name: "Bob", uid: "bob", joinedAt: now - 9_000 },
      mg: { name: "Gus", joinedAt: now - 8_000 },
    },
    memberIdsByUid: { alice: "ma", bob: "mb" },
    memberUids: ["alice", "bob"],
    invite: null as null | { code: string; expiresAt: number },
  };
}

/** The invite document for trip "t1" (its preview fields copied from tripDoc). */
export function inviteDoc(
  expiresAt: number,
  guests: Record<string, string> = { mg: "Gus" },
  tripId = "t1",
  name = "Lisbon",
) {
  return { tripId, expiresAt, name, icon: "flight", currency: "EUR", guests };
}

export function expenseDoc(createdBy = "bob", now = Date.now()) {
  return {
    description: "Dinner",
    amountCents: 9000,
    payerId: "mb",
    shares: { ma: 3000, mb: 3000, mg: 3000 },
    split: "equal",
    spentAt: now - 1000,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

/** Writes documents with rules disabled. */
export async function seed(env: RulesTestEnvironment, docs: Record<string, object>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    for (const [path, data] of Object.entries(docs)) await setDoc(doc(db, path), data);
  });
}

export const as = (env: RulesTestEnvironment, uid: string | null) =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore() as unknown as Firestore;
