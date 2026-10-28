// Demo data for manual testing on the local emulators (never production: it only talks to the emulator).
// A trip "Lisbon weekend (demo)" owned by a demo user, joinable forever with code 123456, with members,
// guests to claim, and a few days of expenses (equal and custom splits).
//   node scripts/seed-demo.mjs          → adds it if missing
//   node scripts/seed-demo.mjs --reset  → rewrites it (removes anyone who joined)
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, writeBatch, collection, getDocs } from "firebase/firestore";

export const DEMO_CODE = "123456";
const TRIP = "demo-lisbon";
const FOREVER = Date.UTC(2100, 0, 1);

const env = await initializeTestEnvironment({
  projectId: "demo-evenly",
  firestore: { host: "127.0.0.1", port: 8080 },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const reset = process.argv.includes("--reset");
  if (!reset && (await getDoc(doc(db, `trips/${TRIP}`))).exists()) {
    console.log(`Demo trip already there. Join it with code ${DEMO_CODE}.`);
    return;
  }

  const now = Date.now();
  const day = 86_400_000;
  const minutesAgo = (m) => now - m * 60_000;
  const at = (daysAgo, hour, minute) => {
    const d = new Date(now - daysAgo * day);
    d.setHours(hour, minute, 0, 0);
    return Math.min(d.getTime(), now - 60_000);
  };
  const members = {
    ana: { name: "Ana", uid: "demo-ana", joinedAt: now - 5 * day },
    marco: { name: "Marco", uid: "demo-marco", joinedAt: now - 5 * day + 1000 },
    gus: { name: "Gus", joinedAt: now - 5 * day + 2000 },
    rita: { name: "Rita", joinedAt: now - 5 * day + 3000 },
  };
  const order = Object.keys(members);

  // BAL-2: floor shares, leftover cents to the payer if in the split, else the first participant.
  const equal = (cents, ids, payer) => {
    const parts = order.filter((id) => ids.includes(id));
    const base = Math.floor(cents / parts.length);
    const out = Object.fromEntries(parts.map((id) => [id, base]));
    out[parts.includes(payer) ? payer : parts[0]] += cents - base * parts.length;
    return out;
  };
  const expense = (description, cents, payerId, shares, spentAt, split = "equal") => ({
    description,
    amountCents: cents,
    payerId,
    shares,
    split,
    spentAt,
    createdBy: "demo-ana",
    createdAt: spentAt,
    updatedAt: spentAt,
  });
  const expenses = {
    e1: expense("Taxi from the airport", 3250, "marco", equal(3250, order, "marco"), at(2, 10, 40)),
    e2: expense("Groceries", 6385, "gus", equal(6385, ["ana", "gus", "rita"], "gus"), at(2, 18, 5)),
    e3: expense(
      "Apartment (3 nights)",
      54000,
      "ana",
      { ana: 18000, marco: 18000, gus: 9000, rita: 9000 },
      at(1, 9, 30),
      "custom",
    ),
    e4: expense("Pastéis de nata", 720, "rita", equal(720, order, "rita"), at(1, 16, 15)),
    e5: expense("Tram 28 tickets", 1200, "marco", equal(1200, ["ana", "marco"], "marco"), minutesAgo(95)),
    e6: expense("Dinner at Time Out Market", 12840, "ana", equal(12840, order, "ana"), minutesAgo(20)),
  };

  const batch = writeBatch(db);
  for (const old of (await getDocs(collection(db, `trips/${TRIP}/expenses`))).docs) batch.delete(old.ref);
  batch.set(doc(db, `trips/${TRIP}`), {
    name: "Lisbon weekend (demo)",
    icon: "flight",
    currency: "EUR",
    ownerUid: "demo-ana",
    createdAt: now - 5 * day,
    members,
    memberIdsByUid: { "demo-ana": "ana", "demo-marco": "marco" },
    memberUids: ["demo-ana", "demo-marco"],
    invite: { code: DEMO_CODE, expiresAt: FOREVER },
  });
  batch.set(doc(db, `invites/${DEMO_CODE}`), {
    tripId: TRIP,
    expiresAt: FOREVER,
    name: "Lisbon weekend (demo)",
    icon: "flight",
    currency: "EUR",
    guests: { gus: "Gus", rita: "Rita" },
  });
  for (const [id, e] of Object.entries(expenses)) batch.set(doc(db, `trips/${TRIP}/expenses/${id}`), e);
  await batch.commit();
  console.log(`Demo trip ready. Join it with code ${DEMO_CODE} (you can claim Gus or Rita).`);
});

await env.cleanup();
