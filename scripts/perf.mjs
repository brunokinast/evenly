// Phase 6b: repeatable timings of what users feel, on a production build against the local emulators, with
// Lighthouse's mobile profile (CPU 4× slower, 150 ms latency, 1.6 Mbps down / 750 kbps up).
//   npm run emulators          (or the LAN preview) in another terminal
//   node scripts/perf.mjs      → builds dist-perf/, serves it, prints a table, writes perf-results/<time>.json
//   node scripts/perf.mjs --no-build --runs 5 --label "after X"
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, writeBatch } from "firebase/firestore";

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const RUNS = Number(opt("--runs", 3));
const LABEL = opt("--label", "");
const PORT = 4173;
const URL = `http://localhost:${PORT}`;

if (!args.includes("--no-build")) {
  // Mode "perf" has no .env file, so the build talks to the emulators (src/data/firebase.ts).
  const b = spawnSync("npx vite build --mode perf --outDir dist-perf", { shell: true, stdio: "inherit" });
  if (b.status !== 0) process.exit(1);
}
const server = spawn(`npx vite preview --outDir dist-perf --port ${PORT} --strictPort`, {
  shell: true,
  stdio: "ignore",
});
for (
  let i = 0;
  i < 60 &&
  !(await fetch(URL).then(
    (r) => r.ok,
    () => false,
  ));
  i++
)
  await sleep(500);

const env = await initializeTestEnvironment({
  projectId: "demo-evenly",
  firestore: { host: "127.0.0.1", port: 8080 },
});

const browser = await chromium.launch();
const results = {};
const record = (name, ms) => (results[name] ??= []).push(Math.round(ms));

try {
  for (let run = 0; run < RUNS; run++) {
    console.log(`run ${run + 1}/${RUNS}`);
    await oneRun();
  }
} finally {
  await browser.close();
  await env.cleanup();
  server.kill();
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`\n${LABEL || "perf"} (median of ${RUNS}, ms)`);
for (const [name, xs] of Object.entries(results)) {
  console.log(`  ${name.padEnd(42)} ${String(median(xs)).padStart(6)}   [${xs.join(", ")}]`);
}
mkdirSync("perf-results", { recursive: true });
const file = `perf-results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify({ label: LABEL, runs: RUNS, results }, null, 1));
console.log(`\n→ ${file}`);
process.exit(0);

async function oneRun() {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "en-US",
    // Past the ID-10 install step: the timings are about the app itself.
    storageState: {
      cookies: [],
      origins: [{ origin: URL, localStorage: [{ name: "evenly.installFirstSkipped", value: "1" }] }],
    },
  });
  const page = await context.newPage();
  await throttle(page);

  // 1. First open: nothing cached.
  await page.goto(URL);
  const welcome = await until(page, () => !!document.querySelector("input[autocomplete=given-name]"));
  record("1 first open → Welcome usable", welcome);
  record("1 first open: JS+CSS transferred (kB)", await transferred(page));

  // 2. Enter a name → Home.
  const t0 = await now(page);
  await page.fill("input[autocomplete=given-name]", "Perf");
  await page.keyboard.press("Enter");
  record("2 name entered → Home", (await until(page, () => heading() === "Your trips")) - t0);

  // Data for this user: a big trip (8 people, 150 expenses) and two small ones.
  const uid = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open("firebaseLocalStorageDb");
        open.onsuccess = () => {
          const all = open.result
            .transaction("firebaseLocalStorage")
            .objectStore("firebaseLocalStorage")
            .getAll();
          all.onsuccess = () => resolve(all.result.find((r) => r.value?.uid).value.uid);
        };
      }),
  );
  await seed(uid);
  await until(page, () => document.body.innerText.includes("Perf big trip"), 30_000);
  await page.close();

  // 3. Returning launch: service worker, HTTP cache and Firestore's offline cache are warm.
  for (let i = 0; i < 2; i++) {
    const p = await context.newPage();
    await throttle(p);
    await p.goto(URL);
    record(
      "3 returning launch → Home with trips",
      await until(p, () => document.body.innerText.includes("Perf big trip")),
    );
    await p.close();
  }

  // 4. Home → the big trip with its expenses.
  const p = await context.newPage();
  await throttle(p);
  await p.goto(URL);
  await until(p, () => document.body.innerText.includes("Perf big trip"));
  let s = await now(p);
  await p.evaluate(() =>
    [...document.querySelectorAll("main button")]
      .find((b) => b.textContent.includes("Perf big trip"))
      .click(),
  );
  record(
    "4 open trip → expenses shown",
    (await until(p, () => document.body.innerText.includes("Expense 149"))) - s,
  );

  // 5. Add expense: form ready, then Save → back on the trip with it listed.
  s = await now(p);
  await p.getByRole("button", { name: "Add expense" }).click();
  record(
    "5a Add expense → form ready",
    (await until(
      p,
      () => document.activeElement?.getAttribute("inputmode") === "numeric" || heading() === "New expense",
    )) - s,
  );
  await p.keyboard.type("1234");
  await p.keyboard.press("Enter");
  await p.keyboard.type("Perf lunch");
  await p.keyboard.press("Enter");
  s = await now(p);
  await p.getByRole("button", { name: "Save" }).click();
  record(
    "5b Save → back on trip, expense listed",
    (await until(
      p,
      () => heading() !== "New expense" && document.body.innerText.includes("Perf lunch"),
      30_000,
    )) - s,
  );

  // 6. Expense details sheet.
  s = await now(p);
  await p.getByText("Perf lunch").first().click();
  record(
    "6 tap expense → details open",
    (await until(p, () => !!document.querySelector("dialog[open]"))) - s,
  );
  await context.close();
}

async function throttle(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
}

/** ms since the page's navigation started (performance.now) when `cond` first holds. */
async function until(page, cond, timeout = 20_000) {
  const fn = `(() => { const heading = () => document.querySelector("h1")?.textContent?.trim(); return (${cond.toString()})(); })()`;
  await page.waitForFunction(fn, undefined, { polling: "raf", timeout });
  return now(page);
}
function now(page) {
  return page.evaluate(() => performance.now());
}
function heading() {} // (defined inside the page by until())

async function transferred(page) {
  return Math.round(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter((e) => /\.(js|css)(\?|$)/.test(e.name))
          .reduce((a, e) => a + e.transferSize, 0) / 1024,
    ),
  );
}

async function seed(uid) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = Date.now();
    const trip = (id, name, guests) => {
      const members = { me: { name: "Perf", uid, joinedAt: now - 1e9 } };
      guests.forEach((g, i) => (members[`g${i}`] = { name: g, joinedAt: now - 1e9 + i + 1 }));
      return setDoc(doc(db, `trips/${id}`), {
        name,
        icon: "beach",
        currency: "BRL",
        ownerUid: uid,
        createdAt: now - 1e9,
        members,
        memberIdsByUid: { [uid]: "me" },
        memberUids: [uid],
        invite: null,
      });
    };
    const big = `perf-${uid}`;
    await trip(big, "Perf big trip", ["Ana", "Bia", "Caio", "Duda", "Edu", "Fê", "Gui"]);
    await trip(`${big}-2`, "Perf small one", ["Ana"]);
    await trip(`${big}-3`, "Perf small two", ["Bia"]);
    const ids = ["me", "g0", "g1", "g2", "g3", "g4", "g5", "g6"];
    const batch = writeBatch(db);
    for (let i = 0; i < 150; i++) {
      const at = now - (150 - i) * 3_600_000;
      batch.set(doc(db, `trips/${big}/expenses/e${i}`), {
        description: `Expense ${i}`,
        amountCents: 8000,
        payerId: ids[i % 8],
        shares: Object.fromEntries(ids.map((id) => [id, 1000])),
        split: "equal",
        spentAt: at,
        createdBy: uid,
        createdAt: at,
        updatedAt: at,
      });
    }
    await batch.commit();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
