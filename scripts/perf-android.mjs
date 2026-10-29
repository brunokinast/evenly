// Phase 6b (docs/performance.md): timings of the Android app ("Evenly Dev", the debug APK against the local
// emulators) on a connected device or AVD. Needs: the emulators running, `npm run android:dev` installed.
//   node scripts/perf-android.mjs [--runs 5] [--serial <adb serial>] [--label "after X"]
// Each run: force-stop → cold start (`am start -W`: Android's own launch time) → the app's marks read over the
// WebView's DevTools connection → open the main trip → Add expense → Save. The first run seeds data: a user
// named "Perf Android" (or "Perf Chrome") with the same trips as scripts/perf.mjs --size big.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, writeBatch } from "firebase/firestore";

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const RUNS = Number(opt("--runs", 5));
const LABEL = opt("--label", "");
const SERIAL = opt("--serial", "");
/** --chrome <url>: the website in Chrome on the same device instead (JS SDK vs the app's native plugins, R3). */
const CHROME = opt("--chrome", "");
const PKG = CHROME ? "com.android.chrome" : "br.com.kinast.evenly.debug";
const ACTIVITY = `${PKG}/br.com.kinast.evenly.MainActivity`;
const NAME = CHROME ? "Perf Chrome" : "Perf Android";
/** The few labels the runs look for, in the device's language (src/i18n). */
const TEXT = {
  en: { home: "Your trips", add: "Add expense", form: "New expense", save: "Save" },
  "pt-BR": { home: "Suas viagens", add: "Nova despesa", form: "Nova despesa", save: "Salvar" },
};
const text = async (page) => TEXT[await page.evaluate(() => document.documentElement.lang)] ?? TEXT.en;
const launch = () =>
  adb(
    CHROME
      ? `shell am start -W -a android.intent.action.VIEW -d ${CHROME} ${PKG}`
      : `shell am start -W -n ${ACTIVITY}`,
  );
const PORT = 9223;

const sdk = process.env.ANDROID_HOME ?? `${process.env.LOCALAPPDATA}/Android/Sdk`;
const adb = (cmd) =>
  execSync(`"${sdk}/platform-tools/adb" ${SERIAL ? `-s ${SERIAL} ` : ""}${cmd}`, { encoding: "utf8" }).trim();

const env = await initializeTestEnvironment({
  projectId: "demo-evenly",
  firestore: { host: "127.0.0.1", port: 8080 },
});
const results = {};
const record = (name, ms) => (results[name] ??= []).push(Math.round(ms));

await setUp();
for (let run = 0; run < RUNS; run++) {
  console.log(`run ${run + 1}/${RUNS}`);
  await oneRun();
}
await env.cleanup();

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`\n${LABEL || "perf"}: Android app, median of ${RUNS} (ms)`);
for (const [name, xs] of Object.entries(results)) {
  console.log(`  ${name.padEnd(52)} ${String(median(xs)).padStart(6)}   [${xs.join(", ")}]`);
}
mkdirSync("perf-results", { recursive: true });
const file = `perf-results/android-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify({ label: LABEL, runs: RUNS, results }, null, 1));
console.log(`\n→ ${file}`);
process.exit(0);

async function oneRun() {
  let browser, page;
  if (CHROME) {
    // A reload of the same tab (a second tab would lose the offline cache): the site's returning launch.
    browser = await connect();
    page = await findPage(browser);
    await page.goto(CHROME);
  } else {
    adb(`shell am force-stop ${PKG}`);
    await sleep(1000);
    const start = launch();
    record("cold start: Android launch (am start TotalTime)", Number(/TotalTime: (\d+)/.exec(start)?.[1]));
    browser = await connect();
    page = await findPage(browser);
  }
  await waitMark(page, "painted:home");
  record("cold start → trips on screen (page clock)", await markAt(page, "painted:home"));
  for (const name of [
    "js-ready",
    "firebase-ready",
    "auth-ready",
    "snapshot:trips:cache",
    "snapshot:trips:server",
  ]) {
    const at = await markAt(page, name);
    if (!Number.isNaN(at)) record(`  cold start: ${name}`, at);
  }

  let t = await clickText(page, "main button", "Perf main trip");
  await waitMark(page, "painted:trip");
  record("Home → trip with expenses", (await markAt(page, "painted:trip")) - t);

  t = await clickText(page, "button", (await text(page)).add);
  await waitMark(page, "painted:form");
  record("Add expense → form ready", (await markAt(page, "painted:form", -1)) - t);
  await page.keyboard.type("1234");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Perf lunch");
  await page.keyboard.press("Enter");
  await sleep(300);
  t = await clickText(page, "button", (await text(page)).save);
  await page.waitForFunction(
    (newTitle) =>
      document.querySelector("h1")?.textContent?.trim() !== newTitle &&
      document.body.innerText.includes("Perf lunch"),
    (await text(page)).form,
    { polling: "raf", timeout: 30_000 },
  );
  record("Save → back on trip, expense listed", (await now(page)) - t);
  record("  Save: server confirmed", (await markAt(page, "save:confirmed", -1)) - t);
  await browser.close().catch(() => {});
}

async function connect() {
  for (let i = 0; i < 50; i++) {
    const pid = adb(`shell pidof ${PKG}`).split(/\s+/)[0];
    const sockets = adb("shell cat /proc/net/unix");
    const socket = CHROME ? "chrome_devtools_remote" : `webview_devtools_remote_${pid}`;
    if (pid && sockets.includes(socket)) {
      adb(`forward tcp:${PORT} localabstract:${socket}`);
      return chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    }
    await sleep(200);
  }
  throw new Error("WebView DevTools socket not found (is the debug APK installed?)");
}

async function findPage(browser) {
  for (let i = 0; i < 50; i++) {
    const pages = browser.contexts().flatMap((c) => c.pages());
    const page = CHROME ? pages.find((p) => p.url().startsWith(CHROME)) : pages[0];
    if (page) return page;
    await sleep(200);
  }
  throw new Error("no page in the WebView");
}

/** Once per device: a user named "Perf Android"/"Perf Chrome" with the --size big trips, the main one opened once so its
 * expenses are in the offline cache (a returning user). */
async function setUp() {
  if (CHROME) {
    // No first-run screens; Chrome keeps its data (its user is reused or created below).
    adb(
      `shell "echo 'chrome --disable-fre --no-default-browser-check --no-first-run' > /data/local/tmp/chrome-command-line"`,
    );
    adb(`shell am set-debug-app --persistent ${PKG}`);
    adb(`shell am force-stop ${PKG}`);
  } else adb(`shell pm clear ${PKG}`); // debug app only: a clean user on the current emulators
  launch();
  const browser = await connect();
  const page = await findPage(browser);
  await page.waitForFunction(() => !!document.querySelector("h1"), undefined, { timeout: 30_000 });
  if (CHROME) {
    // Past ID-10's "get the app" step: the timings are about the site itself.
    await page.evaluate(() => localStorage.setItem("evenly.installFirstSkipped", "1"));
    await page.reload();
    await page.waitForFunction(() => !!document.querySelector("h1"), undefined, { timeout: 30_000 });
  }
  if (await page.evaluate(() => !!document.querySelector("input[autocomplete=given-name]"))) {
    await page.focus("input[autocomplete=given-name]");
    await page.keyboard.type(NAME);
    await page.keyboard.press("Enter");
  }
  await page.waitForFunction(
    (titles) => titles.includes(document.querySelector("h1")?.textContent?.trim()),
    Object.values(TEXT).map((x) => x.home),
    {
      timeout: 30_000,
    },
  );
  if (!(await page.evaluate(() => document.body.innerText.includes("Perf main trip")))) {
    const res = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-evenly/accounts:query",
      {
        method: "POST",
        headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
        body: "{}",
      },
    );
    const me = (await res.json()).userInfo
      .filter((u) => u.displayName === NAME)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!me) throw new Error("couldn't find the Perf Android account");
    await seed(me.localId);
  }
  await page.waitForFunction(() => document.body.innerText.includes("Perf main trip"), undefined, {
    timeout: 60_000,
  });
  await clickText(page, "main button", "Perf main trip");
  await page.waitForFunction(() => document.body.innerText.includes("Expense 149"), undefined, {
    timeout: 60_000,
  });
  await browser.close().catch(() => {});
}

function now(page) {
  return page.evaluate(() => performance.now());
}

function waitMark(page, name) {
  return page.waitForFunction((n) => performance.getEntriesByName(`evenly:${n}`).length > 0, name, {
    timeout: 60_000,
  });
}

function markAt(page, name, index = 0) {
  return page.evaluate(
    ([n, i]) => performance.getEntriesByName(`evenly:${n}`).at(i)?.startTime ?? NaN,
    [name, index],
  );
}

function clickText(page, selector, text) {
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

async function seed(uid) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = Date.now();
    const ids = Array.from({ length: 8 }, (_, i) => (i === 0 ? "me" : `g${i - 1}`));
    const trip = (id, name, people, createdAt) => {
      const members = { me: { name: NAME, uid, joinedAt: now - 1e9 } };
      for (let i = 0; i < people - 1; i++)
        members[`g${i}`] = { name: `Guest ${i}`, joinedAt: now - 1e9 + i + 1 };
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
    await trip(`${main}-2`, "Perf small one", 2, now - 3e9);
    await trip(`${main}-3`, "Perf small two", 2, now - 2e9);
    await trip(main, "Perf main trip", 8, now - 1e9);
    const batch = writeBatch(db);
    for (let i = 0; i < 150; i++) {
      const at = now - (150 - i) * 3_600_000;
      batch.set(doc(db, `trips/${main}/expenses/e${i}`), {
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
