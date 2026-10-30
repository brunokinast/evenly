// Shared by scripts/perf.mjs (web) and scripts/perf-android.mjs (Android app): options, results, the
// app's timing marks (src/lib/perf.ts) read from a page, and the seeded trips. Emulators only.
import { mkdirSync, writeFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, writeBatch } from "firebase/firestore";

const args = process.argv.slice(2);
/** `--name value` from the command line, or `def`. */
export const option = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
export const hasFlag = (name) => args.includes(name);

/** Admin access to the local emulators' demo project (rules off for seeding). */
export const emulatorEnv = () =>
  initializeTestEnvironment({ projectId: "demo-evenly", firestore: { host: "127.0.0.1", port: 8080 } });

/** Timings by name, printed as medians and saved to perf-results/<prefix><time>.json. */
export function recorder() {
  const results = {};
  return {
    results,
    record: (name, ms) => (results[name] ??= []).push(Math.round(ms)),
    report(title, prefix, meta) {
      const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
      console.log(`\n${title} (ms)`);
      for (const [name, xs] of Object.entries(results)) {
        console.log(`  ${name.padEnd(52)} ${String(median(xs)).padStart(6)}   [${xs.join(", ")}]`);
      }
      mkdirSync("perf-results", { recursive: true });
      const file = `perf-results/${prefix}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      writeFileSync(file, JSON.stringify({ ...meta, results }, null, 1));
      console.log(`\n→ ${file}`);
    },
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function now(page) {
  return page.evaluate(() => performance.now());
}

/** Waits until the app's mark `evenly:<name>` exists. */
export function waitMark(page, name) {
  return page.waitForFunction((n) => performance.getEntriesByName(`evenly:${n}`).length > 0, name, {
    timeout: 60_000,
  });
}

/** Page time of a mark (the first, or `index` -1 = the last); NaN if none. */
export function markAt(page, name, index = 0) {
  return page.evaluate(
    ([n, i]) => performance.getEntriesByName(`evenly:${n}`).at(i)?.startTime ?? NaN,
    [name, index],
  );
}

/** Clicks the last element matching `selector` whose text includes `text`; returns the page time. Clicks
 * through the page (Playwright's click() can hang in an Android WebView). */
export function clickText(page, selector, text) {
  return page.evaluate(
    ([s, x]) => {
      const el = [...document.querySelectorAll(s)].filter((e) => e.textContent.includes(x)).at(-1);
      const t = performance.now();
      el.click();
      return t;
    },
    [selector, text],
  );
}

const GUESTS = ["Ana", "Bia", "Caio", "Duda", "Edu", "Fê", "Gui", "Hana", "Ivo", "Juca"];
/** Member ids of a seeded main trip: me, then guests g0, g1, … */
export const memberIds = (people) => Array.from({ length: people }, (_, i) => (i === 0 ? "me" : `g${i - 1}`));

/** An equal-split expense of 10.00 per person. */
export function expenseDoc(description, payerId, at, ids) {
  return {
    description,
    amountCents: 1000 * ids.length,
    payerId,
    shares: Object.fromEntries(ids.map((id) => [id, 1000])),
    split: "equal",
    spentAt: at,
    createdBy: "seed",
    createdAt: at,
    updatedAt: at,
  };
}

/** A user's trips: "Perf main trip" with `people` and `expenses` ("Expense 0…n-1"), and two small ones. */
export async function seedTrips(env, uid, { myName, people, expenses }) {
  const ids = memberIds(people);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const t0 = Date.now();
    const trip = (id, name, size, createdAt) => {
      const members = { me: { name: myName, uid, joinedAt: t0 - 1e9 } };
      for (let i = 0; i < size - 1; i++) {
        members[`g${i}`] = { name: `${GUESTS[i % GUESTS.length]} ${i}`, joinedAt: t0 - 1e9 + i + 1 };
      }
      return setDoc(doc(db, `trips/${id}`), {
        name,
        icon: "beach",
        currency: "BRL",
        ownerUid: uid,
        createdAt,
        members,
        memberIdsByUid: { [uid]: "me" },
        memberUids: [uid],
        invite: null,
      });
    };
    const main = `perf-${uid}`;
    await trip(`${main}-2`, "Perf small one", 2, t0 - 3e9);
    await trip(`${main}-3`, "Perf small two", 2, t0 - 2e9);
    await trip(main, "Perf main trip", people, t0 - 1e9);
    for (let start = 0; start < expenses; start += 400) {
      const batch = writeBatch(db);
      for (let i = start; i < Math.min(expenses, start + 400); i++) {
        const at = t0 - (expenses - i) * 3_600_000;
        batch.set(
          doc(db, `trips/${main}/expenses/e${i}`),
          expenseDoc(`Expense ${i}`, ids[i % people], at, ids),
        );
      }
      await batch.commit();
    }
  });
}
