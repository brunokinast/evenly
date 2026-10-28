import { afterAll, beforeAll, describe, it } from "vitest";
import { assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { rulesEnv } from "./env";

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await rulesEnv();
});
afterAll(() => env.cleanup());

describe("default deny (data-model: everything not listed is denied)", () => {
  it("denies reads and writes to unknown collections", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(setDoc(doc(db, "users/alice"), { displayName: "Alice" }));
  });
});
