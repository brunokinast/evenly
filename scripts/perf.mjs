// Phase 6b (docs/performance.md): repeatable timings of what users feel, on a production build against the
// local emulators, with a mid-range phone's CPU (4× slower) and a mobile network.
//   npm run emulators                    (or the LAN preview) in another terminal
//   node scripts/perf.mjs                → builds dist-perf/, serves it, runs, prints medians,
//                                          writes perf-results/<time>.json
//   options: --no-build  --runs 5  --size typical|big  --network slow|good  --label "after X"
//            --only live,create,pdf,relaunch   (optional journeys; while iterating on one fix, fewer = faster)
// Times come from the page's own clock (performance.now) and the app's marks (src/lib/perf.ts), so they
// include rendering, not Playwright's overhead.
import { spawn, spawnSync } from "node:child_process";
import { chromium, devices } from "@playwright/test";
import { doc, setDoc } from "firebase/firestore";
import {
  clickText,
  emulatorEnv,
  expenseDoc,
  hasFlag,
  markAt,
  memberIds,
  now,
  option,
  recorder,
  seedTrips,
  waitMark,
} from "./perf-lib.mjs";

const RUNS = Number(option("--runs", 5));
// Typical trips are what users have (docs/performance.md); big is kept to compare with earlier results.
const SIZE = option("--size", "typical");
const NETWORK = option("--network", "slow");
const LABEL = option("--label", "");
/** --only live,create,pdf,relaunch: the optional journeys to run (default all). First open, launch, trip, tabs,
 * Add expense, Save and details always run: everything else builds on them. */
const ONLY = option("--only", "live,create,pdf,relaunch").split(",");
const want = (journey) => ONLY.includes(journey);
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

/** Main trip size per --size; every user also has two small trips. */
const SIZES = {
  typical: { people: 6, expenses: 40 },
  big: { people: 8, expenses: 150 },
};
/** Lighthouse's mobile "slow 4G", and a good 4G connection. */
const NETWORKS = {
  slow: { latency: 150, down: 1.6 * 1024 * 1024, up: 750 * 1024 },
  good: { latency: 40, down: 9 * 1024 * 1024, up: 3 * 1024 * 1024 },
};
const size = SIZES[SIZE];
const network = NETWORKS[NETWORK];
if (!size || !network) throw new Error(`unknown --size ${SIZE} or --network ${NETWORK}`);
const ids = memberIds(size.people);

if (!hasFlag("--no-build")) {
  // Mode "perf" has no .env file, so the build talks to the emulators (src/data/firebase.ts).
  const b = spawnSync("npx vite build --mode perf --outDir dist-perf", { shell: true, stdio: "inherit" });
  if (b.status !== 0) process.exit(1);
}
const server = spawn(`npx vite preview --outDir dist-perf --port ${PORT} --strictPort`, {
  shell: true,
  stdio: "ignore",
});
await waitForServer();

const env = await emulatorEnv();
await checkEmulator();
const browser = await chromium.launch();
const { record, report } = recorder();

try {
  for (let run = 0; run < RUNS; run++) {
    console.log(`run ${run + 1}/${RUNS}`);
    await oneRun();
  }
  if ((await writeTime()) > 150) {
    console.warn("WARNING: the emulator slowed down during the run; write timings are unreliable.");
  }
} finally {
  await browser.close();
  await env.cleanup();
  server.kill();
}

report(`${LABEL || "perf"}: size ${SIZE}, network ${NETWORK}, median of ${RUNS}`, "", {
  label: LABEL,
  size: SIZE,
  network: NETWORK,
  runs: RUNS,
});
process.exit(0);

async function oneRun() {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "en-US",
    // Past the ID-10 install step: the timings are about the app itself.
    storageState: {
      cookies: [],
      origins: [{ origin: BASE_URL, localStorage: [{ name: "evenly.installFirstSkipped", value: "1" }] }],
    },
  });

  // First open: nothing cached (no service worker, no HTTP cache, no identity).
  let page = await open(context);
  await waitMark(page, "painted:welcome");
  record("first open → name screen", await markAt(page, "painted:welcome"));
  await breakdown(page, "first open", ["js-ready", "firebase-ready", "auth-ready"]);
  record("first open: JS+CSS downloaded (kB)", await downloadedKb(page));

  // Name → Home, after the time a person takes to read the screen and type a name (the identity is created
  // meanwhile, ID-6; typing at once would only measure the download that a real person never waits for).
  await page.waitForTimeout(2500);
  let t = await now(page);
  await page.fill("input[autocomplete=given-name]", "Perf");
  await page.keyboard.press("Enter");
  await waitMark(page, "painted:home");
  record("name entered → Home", (await markAt(page, "painted:home")) - t);
  await seedTrips(env, await myUid(page), { myName: "Perf", ...size });
  await waitText(page, "Perf main trip", "body", 60_000);
  await page.waitForTimeout(1500); // let the service worker finish installing
  await page.close();

  // Returning launch: service worker, HTTP cache and Firestore's offline cache are warm.
  for (let i = 0; i < 2; i++) {
    page = await open(context);
    await waitMark(page, "painted:home");
    record("returning launch → trips on screen", await markAt(page, "painted:home"));
    await breakdown(page, "returning launch", [
      "js-ready",
      "firebase-ready",
      "auth-ready",
      "snapshot:trips:cache",
      "snapshot:trips:server",
    ]);
    if (i === 0) await page.close();
  }

  // Home → the main trip with its expenses (first visit this launch: its listeners start now).
  t = await clickText(page, "main button", "Perf main trip");
  await waitMark(page, "painted:trip");
  record("Home → trip with expenses", (await markAt(page, "painted:trip")) - t);
  await breakdown(
    page,
    "Home → trip",
    ["snapshot:trip:cache", "snapshot:expenses:cache", "snapshot:trip:server", "snapshot:expenses:server"],
    t,
  );

  // Tabs: tap → next frame painted.
  record("tab → Balances", await tapToPaint(page, "[role=tab]:nth-child(2)"));
  record("tab → Members", await tapToPaint(page, "[role=tab]:nth-child(3)"));
  record("tab → Expenses", await tapToPaint(page, "[role=tab]:nth-child(1)"));

  // Add expense: tap → form painted with its data.
  t = await clickText(page, "button", "Add expense");
  await waitMark(page, "painted:form");
  record("Add expense → form ready", (await markAt(page, "painted:form", -1)) - t);
  await page.keyboard.type("1234");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Perf lunch");
  await page.keyboard.press("Enter");

  // Save: tap → back on the trip with it listed; and → the server's confirmation.
  t = await clickText(page, "button", "Save");
  await page.waitForFunction(
    () =>
      document.querySelector("h1")?.textContent?.trim() !== "New expense" &&
      document.body.innerText.includes("Perf lunch"),
    undefined,
    { polling: "raf", timeout: 30_000 },
  );
  record("Save → back on trip, expense listed", (await now(page)) - t);
  record("  Save: server confirmed", (await markAt(page, "save:confirmed", -1)) - t);
  await breakdown(page, "Save", ["snapshot:expenses:cache", "snapshot:expenses:server"], t);

  // Expense details: tap → sheet painted.
  record("tap expense → details", await tapToPaint(page, null, "Perf lunch", "dialog[open]"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  if (want("live")) await otherMember(page);
  if (want("create")) await createTrip(page);
  if (want("pdf")) await exportPdf(page);
  await page.close();
  if (want("relaunch")) await relaunch(context);
  await context.close();
}

/** Another member's change arriving live (written straight to the emulator). */
async function otherMember(page) {
  const tripId = new URL(page.url()).pathname.split("/")[2];
  const t0 = Date.now();
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(
      doc(ctx.firestore(), `trips/${tripId}/expenses/live${t0}`),
      expenseDoc("Perf from Ana", "g0", t0 - 1000, ids),
    ),
  );
  await waitText(page, "Perf from Ana");
  record("other member's expense → on screen", Date.now() - t0);
  const arrived = await page.evaluate(
    (t) =>
      performance
        .getEntriesByName("evenly:snapshot:expenses:server")
        .map((e) => performance.timeOrigin + e.startTime)
        .find((at) => at >= t),
    t0,
  );
  if (arrived) record("  other member's expense: snapshot arrived", arrived - t0);
}

/** Create trip: Home → New trip → sheet closed and the trip listed (TRIP-1: stays on Home). */
async function createTrip(page) {
  await toHome(page);
  await page.getByRole("button", { name: "New trip" }).click();
  await page.getByRole("textbox", { name: "Trip name" }).fill("Perf new trip");
  await page.keyboard.press("Enter");
  const t = await clickText(page, "dialog[open] button", "Create trip");
  await page.waitForFunction(
    () =>
      !document.querySelector("dialog[open]") &&
      document.querySelector("main")?.textContent.includes("Perf new trip"),
    undefined,
    { polling: "raf", timeout: 30_000 },
  );
  record("Create trip → listed on Home", (await now(page)) - t);
  await breakdown(page, "Create trip", ["snapshot:trips:cache", "snapshot:trips:server"], t);
}

/** PDF export of the main trip (the first one loads the PDF code). */
async function exportPdf(page) {
  await toHome(page);
  await clickText(page, "main button", "Perf main trip");
  await waitText(page, "Perf main trip", "h1");
  await page.getByRole("tab", { name: "Balances" }).click();
  await page.evaluate(() => Object.defineProperty(navigator, "canShare", { value: undefined }));
  const download = page.waitForEvent("download", { timeout: 60_000 });
  const d0 = Date.now();
  await page.getByRole("button", { name: "Export as PDF" }).click();
  await download;
  record("Export PDF → file ready (first time)", Date.now() - d0);
}

/** Relaunch, then a trip already seen on this device (its expenses are in the offline cache). */
async function relaunch(context) {
  const page = await open(context);
  await waitMark(page, "painted:home");
  const t = await clickText(page, "main button", "Perf main trip");
  await waitMark(page, "painted:trip");
  record("Home → trip seen before (after relaunch)", (await markAt(page, "painted:trip")) - t);
  await breakdown(
    page,
    "trip seen before",
    ["snapshot:trip:cache", "snapshot:expenses:cache", "snapshot:trip:server", "snapshot:expenses:server"],
    t,
  );
}

/** Back (like Android back) until Home. */
async function toHome(page) {
  for (let i = 0; i < 5; i++) {
    if ((await page.evaluate(() => document.querySelector("h1")?.textContent?.trim())) === "Your trips")
      return;
    await page.goBack();
    await page.waitForTimeout(300);
  }
  throw new Error("couldn't get back to Home");
}

/** A new tab with the phone's CPU and network. */
async function open(context) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: network.latency,
    downloadThroughput: network.down / 8,
    uploadThroughput: network.up / 8,
  });
  await page.goto(BASE_URL);
  return page;
}

/** Where inside a journey the time went: each mark's first time after `from` (navigation start by default). */
async function breakdown(page, journey, names, from = 0) {
  for (const name of names) {
    const at = await page.evaluate(
      ([n, f]) => performance.getEntriesByName(`evenly:${n}`).find((e) => e.startTime >= f)?.startTime,
      [name, from],
    );
    if (at !== undefined) record(`  ${journey}: ${name}`, at - from);
  }
}

/** Tap (by selector, or by visible text) → the next frame painted, once `until` exists if given. */
function tapToPaint(page, selector, text, until) {
  return page.evaluate(
    async ([s, x, u]) => {
      const target = s
        ? document.querySelector(s)
        : [...document.querySelectorAll("button, [role=button], li")]
            .filter((e) => e.textContent.includes(x))
            .at(-1);
      const t = performance.now();
      target.click();
      for (;;) {
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
        if (!u || document.querySelector(u)) return performance.now() - t;
      }
    },
    [selector, text, until],
  );
}

function waitText(page, text, selector = "body", timeout = 30_000) {
  return page.waitForFunction(
    ([x, s]) => [...document.querySelectorAll(s)].some((e) => e.textContent.includes(x)),
    [text, selector],
    { polling: "raf", timeout },
  );
}

function downloadedKb(page) {
  return page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .filter((e) => /\.(js|css)(\?|$)/.test(e.name))
        .reduce((a, e) => a + e.transferSize, 0) / 1024,
  );
}

function myUid(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("firebaseLocalStorageDb");
        req.onsuccess = () => {
          const all = req.result
            .transaction("firebaseLocalStorage")
            .objectStore("firebaseLocalStorage")
            .getAll();
          all.onsuccess = () => resolve(all.result.find((r) => r.value?.uid).value.uid);
        };
      }),
  );
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    const up = await fetch(BASE_URL).then(
      (r) => r.ok,
      () => false,
    );
    if (up) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("preview server didn't start");
}

/**
 * A Firestore emulator that has run for hours (many e2e/perf sessions) can take ~2 s per write, which would
 * swamp every write timing here; a fresh one takes ~20 ms (it degrades again after a few e2e/perf runs).
 * Refuse to measure on a slow one.
 */
async function checkEmulator() {
  let slowest = await writeTime();
  if (slowest > 150) {
    // Clearing its data brings it back (docs/performance.md, R4); the demo trip is seeded again for the LAN preview.
    console.log(
      `The Firestore emulator takes ${slowest} ms per write: clearing it and re-seeding the demo trip.`,
    );
    await env.clearFirestore();
    spawnSync("node scripts/seed-demo.mjs --reset", { shell: true, stdio: "inherit" });
    slowest = await writeTime();
  }
  if (slowest > 150) {
    await env.cleanup();
    server.kill();
    throw new Error(
      `The Firestore emulator still takes ${slowest} ms per write: restart it (npm run emulators).`,
    );
  }
}

/** The slowest of three plain writes (after a warm-up one). */
async function writeTime() {
  const times = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (let i = 0; i < 4; i++) {
      const t = Date.now();
      await setDoc(doc(ctx.firestore(), `perfCheck/w${i}`), { at: t });
      times.push(Date.now() - t);
    }
  });
  return Math.max(...times.slice(1));
}
