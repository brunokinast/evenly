// Phase 6b (docs/performance.md): timings of the Android app ("Evenly Dev", the debug APK against the local
// emulators) on a connected device or AVD. Needs: the emulators running, `npm run android:dev` installed.
//   node scripts/perf-android.mjs [--runs 5] [--serial <adb serial>] [--label "after X"]
// Each run: force-stop → cold start (`am start -W`: Android's own launch time) → the app's marks read over the
// WebView's DevTools connection → open the main trip → Add expense → Save. The first run seeds data: a user
// named "Perf Android" (or "Perf Chrome") with the same trips as scripts/perf.mjs --size big.
import { chromium } from "@playwright/test";
import { adbCommand } from "./android-sdk.mjs";
import {
  clickText,
  emulatorEnv,
  markAt,
  now,
  option,
  recorder,
  seedTrips,
  sleep,
  waitMark,
} from "./perf-lib.mjs";

const RUNS = Number(option("--runs", 5));
const LABEL = option("--label", "");
const SERIAL = option("--serial", "");
/** --chrome <url>: the website in Chrome on the same device instead (JS SDK vs the app's native plugins, R3). */
const CHROME = option("--chrome", "");
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

const adb = (cmd) => adbCommand(`${SERIAL ? `-s ${SERIAL} ` : ""}${cmd}`);

const env = await emulatorEnv();
const { record, report } = recorder();

await setUp();
for (let run = 0; run < RUNS; run++) {
  console.log(`run ${run + 1}/${RUNS}`);
  await oneRun();
}
await env.cleanup();

report(`${LABEL || "perf"}: Android app, median of ${RUNS}`, "android-", { label: LABEL, runs: RUNS });
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
    await seedTrips(env, me.localId, { myName: NAME, people: 8, expenses: 150 });
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
