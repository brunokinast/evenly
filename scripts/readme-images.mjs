// Makes the README's images in docs/readme/ from the real app (dev server + emulators, both running first:
// `npm run emulators` and `npm run dev`). Seeds its own trips, captures phone screens and a short video with
// Playwright, then lays them out in small HTML pages (the app's tokens and font) rendered to PNG/GIF.
//   node scripts/readme-images.mjs            → everything
//   node scripts/readme-images.mjs capture    → just the raw screens and video (node_modules/.tmp/readme)
//   node scripts/readme-images.mjs compose    → just the layouts, from the last capture
// FIRESTORE_PORT=8085 when the emulator runs on another port (VITE_FIRESTORE_PORT for the dev server).
// The GIF needs ffmpeg: FFMPEG=<path to ffmpeg.exe>, or ffmpeg on PATH.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices, expect } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

const RAW = "node_modules/.tmp/readme";
const OUT = "docs/readme";
const BASE = "http://localhost:5173";
const ME = "Bruno";
const step = process.argv[2] ?? "all";

// ---------------------------------------------------------------- data

const now = Date.now();
const day = 86_400_000;
const at = (daysAgo, hour, minute) => {
  const d = new Date(now - daysAgo * day);
  d.setHours(hour, minute, 0, 0);
  return Math.min(d.getTime(), now - 60_000);
};

/** A trip whose guest "Bruno" the capture user claims; `expenses` as [description, cents, payer, shares]. */
function trip(id, code, name, icon, currency, people, expenses, activeAt, createdAt = activeAt - 2 * day) {
  const members = Object.fromEntries(
    people.map((p, i) => [p, { name: p[0].toUpperCase() + p.slice(1), joinedAt: createdAt + i * 1000 }]),
  );
  members.bruno = { name: ME, joinedAt: createdAt + 900 };
  members.ana.uid = "readme-ana";
  return {
    id,
    code,
    doc: {
      name,
      icon,
      currency,
      ownerUid: "readme-ana",
      createdAt,
      activeAt,
      members,
      memberIdsByUid: { "readme-ana": "ana" },
      memberUids: ["readme-ana"],
      invite: { code, expiresAt: now + day },
    },
    invite: {
      tripId: id,
      expiresAt: now + day,
      name,
      icon,
      currency,
      guests: Object.fromEntries(
        Object.entries(members)
          .filter(([, m]) => !m.uid)
          .map(([k, m]) => [k, m.name]),
      ),
    },
    expenses: expenses.map(([description, amountCents, payerId, shares, spentAt, split = "equal"], i) => ({
      id: `e${i}`,
      description,
      amountCents,
      payerId,
      shares,
      split,
      spentAt,
      createdBy: "readme-ana",
      createdAt: spentAt,
      updatedAt: spentAt,
    })),
  };
}

/** Equal split with the leftover cents to the payer (BAL-2; a copy, this runs in plain Node). */
function equal(cents, ids, payer) {
  const base = Math.floor(cents / ids.length);
  const out = Object.fromEntries(ids.map((id) => [id, base]));
  out[ids.includes(payer) ? payer : ids[0]] += cents - base * ids.length;
  return out;
}

const lisbonPeople = ["ana", "bruno", "marco", "rita"];
const TRIPS = [
  trip(
    "readme-bday",
    "710004",
    "Marco's birthday dinner",
    "celebration",
    "BRL",
    ["ana", "marco"],
    [["Dinner", 64000, "ana", equal(64000, ["ana", "bruno", "marco"], "ana"), at(70, 21, 0)]],
    now - 70 * day,
  ),
  trip(
    "readme-ski",
    "710002",
    "Ski week in Bariloche",
    "mountain",
    "USD",
    ["ana", "lucas"],
    [["Lift passes", 41400, "lucas", equal(41400, ["ana", "bruno", "lucas"], "lucas"), at(40, 9, 0)]],
    now - 38 * day,
  ),
  trip(
    "readme-beach",
    "710003",
    "Florianópolis",
    "beach",
    "BRL",
    ["ana", "julia", "pedro"],
    [
      [
        "Beach house",
        180000,
        "julia",
        equal(180000, ["ana", "bruno", "julia", "pedro"], "julia"),
        at(12, 15, 0),
      ],
    ],
    now - 11 * day,
  ),
  trip(
    "readme-lisbon",
    "710001",
    "Lisbon weekend",
    "flight",
    "EUR",
    ["ana", "marco", "rita"],
    [
      ["Taxi from the airport", 3250, "marco", equal(3250, lisbonPeople, "marco"), at(2, 10, 40)],
      [
        "Apartment (3 nights)",
        54000,
        "ana",
        { ana: 18000, bruno: 18000, marco: 9000, rita: 9000 },
        at(2, 14, 5),
        "custom",
      ],
      ["Groceries", 6385, "bruno", equal(6385, ["ana", "bruno", "rita"], "bruno"), at(2, 18, 5)],
      ["Pastéis de nata", 720, "rita", equal(720, lisbonPeople, "rita"), at(1, 16, 15)],
      ["Tram 28 tickets", 1200, "marco", equal(1200, ["bruno", "marco"], "marco"), at(1, 11, 30)],
      ["Dinner at Time Out Market", 12840, "bruno", equal(12840, lisbonPeople, "bruno"), now - 20 * 60_000],
    ],
    now - 20 * 60_000,
  ),
];

async function withDb(fn) {
  const env = await initializeTestEnvironment({
    projectId: "demo-evenly",
    firestore: { host: "127.0.0.1", port: Number(process.env.FIRESTORE_PORT) || 8080 },
  });
  await env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
  await env.cleanup();
}

const seed = () =>
  withDb(async (db) => {
    for (const t of TRIPS) {
      await setDoc(doc(db, `trips/${t.id}`), t.doc);
      await setDoc(doc(db, `invites/${t.code}`), t.invite);
      for (const { id, ...e } of t.expenses) await setDoc(doc(db, `trips/${t.id}/expenses/${id}`), e);
    }
  });

const unseed = () =>
  withDb(async (db) => {
    for (const t of TRIPS) {
      for (const e of (await getDocs(collection(db, `trips/${t.id}/expenses`))).docs) await deleteDoc(e.ref);
      await deleteDoc(doc(db, `invites/${t.code}`));
      await deleteDoc(doc(db, `trips/${t.id}`));
    }
  });

// ---------------------------------------------------------------- capture

const phone = {
  ...devices["Pixel 7"],
  baseURL: BASE,
  locale: "en-US",
  colorScheme: "light",
  deviceScaleFactor: 3,
};
const settle = (page) => page.waitForTimeout(700);
const SKIP_INSTALL = {
  cookies: [],
  origins: [{ origin: BASE, localStorage: [{ name: "evenly.installFirstSkipped", value: "1" }] }],
};
// What Gemini wrote to the "Evenly" calendar (dev stand-in, src/app/devCalendar.ts); "rta" is a typo for Rita.
const GEMINI_EVENTS = [
  { id: "g1", title: "40 | dinner | ana | lisbon | ", start: now - 3 * 60_000, allDay: false },
  {
    id: "g2",
    title: "18.50 | museum tickets | everyone | lisbon | ",
    start: now - 2 * 60_000,
    allDay: false,
  },
  { id: "g3", title: "12 | uber to the hotel | rta | lisbon | ", start: now - 60_000, allDay: false },
];
/** Shows a soft dot where the (simulated) finger taps, for the videos. */
const TAP_DOTS = `addEventListener("pointerdown", (e) => {
  // A popover lives in the top layer, so the dot shows above open sheets (native <dialog>s) too.
  const d = document.createElement("div");
  d.popover = "manual";
  d.style.cssText = "position:fixed;inset:auto;margin:0;padding:0;border:0;pointer-events:none;" +
    "width:44px;height:44px;translate:-22px -22px;border-radius:50%;background:rgba(23,26,33,.3);" +
    "transition:transform .45s ease-out,opacity .45s ease-out;left:" + e.clientX + "px;top:" + e.clientY + "px";
  document.body.appendChild(d);
  d.showPopover();
  requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = "scale(1.6)"; d.style.opacity = "0"; }));
  setTimeout(() => d.remove(), 600);
}, true);`;

async function capture() {
  rmSync(RAW, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });
  await unseed(); // leftovers of an interrupted run
  await seed();
  const browser = await chromium.launch();
  try {
    // Stills: a user who claimed "Bruno" in three trips (Lisbon last, so it's on top).
    const ctx = await browser.newContext({
      ...phone,
      reducedMotion: "reduce",
      storageState: SKIP_INSTALL,
    });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.getByRole("textbox", { name: "What's your name?" }).fill(ME);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    for (const t of TRIPS) {
      await page.getByRole("button", { name: "Join trip" }).click();
      await page.getByRole("textbox", { name: "Invite code" }).fill(t.code);
      const dialog = page.getByRole("dialog", { name: "Join trip" });
      await dialog.getByRole("button", { name: ME }).click();
      await dialog.getByRole("button", { name: `Join as ${ME}` }).click();
      await expect(page.getByRole("heading", { name: t.doc.name })).toBeVisible();
      await expect(page.getByText(/^You joined/)).toBeHidden({ timeout: 10_000 });
      await page.getByRole("button", { name: "Back to your trips" }).click();
      await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    }
    await settle(page);
    await page.screenshot({ path: join(RAW, "home.png") });

    await page
      .getByRole("main")
      .getByRole("button", { name: /Lisbon weekend/ })
      .first()
      .click();
    await page.getByRole("tab", { name: "Expenses" }).click();
    await expect(page.getByText("Dinner at Time Out Market")).toBeVisible();
    await settle(page);
    await page.screenshot({ path: join(RAW, "expenses.png") });
    await page.getByRole("tab", { name: "Balances" }).click();
    await settle(page);
    await page.screenshot({ path: join(RAW, "balances.png") });

    // Gemini review: what Gemini wrote to the "Evenly" calendar (dev stand-in, src/app/devCalendar.ts).
    await page.getByRole("button", { name: "Back to your trips" }).click();
    await page.evaluate((events) => {
      localStorage.setItem("evenly.devCalendar", JSON.stringify({ access: "granted", events }));
    }, GEMINI_EVENTS);
    await page.reload();
    const sheet = page.getByRole("dialog", { name: /^From Gemini/ });
    await expect(sheet).toBeVisible();
    await settle(page);
    await page.screenshot({ path: join(RAW, "gemini.png") });
    await page.evaluate(() => localStorage.removeItem("evenly.devCalendar"));
    const state = await ctx.storageState({ indexedDB: true });
    await ctx.close();

    // Feature videos: real animations, a human pace, a dot where the finger taps.
    const record = async (name, storageState) => {
      const c = await browser.newContext({
        ...phone,
        deviceScaleFactor: 1,
        storageState,
        // Recorded at the viewport's CSS size (Playwright doesn't upscale); the GIFs are smaller anyway.
        recordVideo: { dir: join(RAW, name), size: phone.viewport },
      });
      await c.addInitScript(TAP_DOTS);
      const p = await c.newPage();
      return { c, p, name };
    };
    const save = async ({ c, name }) => {
      await c.close();
      const dir = join(RAW, name);
      renameSync(
        join(
          dir,
          readdirSync(dir).find((f) => f.endsWith(".webm")),
        ),
        join(RAW, `${name}.webm`),
      );
      rmSync(dir, { recursive: true });
    };
    const tap = async (locator) => {
      await locator.hover();
      await locator.page().waitForTimeout(250);
      await locator.click();
    };

    // Settle-up: from the expenses to the balances and who pays whom.
    {
      const r = await record("settle", state);
      const v = r.p;
      await v.goto("/trip/readme-lisbon/expenses");
      await expect(v.getByText("Dinner at Time Out Market")).toBeVisible();
      await v.waitForTimeout(1500);
      await tap(v.getByRole("tab", { name: "Balances" }));
      await v.waitForTimeout(1800);
      await v.mouse.move(206, 500);
      for (let i = 0; i < 12; i++) {
        await v.mouse.wheel(0, 40);
        await v.waitForTimeout(60);
      }
      await v.waitForTimeout(2500);
      await save(r);
    }

    // Join: a new person types the code and claims their spot.
    {
      const pre = await browser.newContext({ ...phone, storageState: SKIP_INSTALL });
      const p = await pre.newPage();
      await p.goto("/");
      await p.getByRole("textbox", { name: "What's your name?" }).fill("Rita");
      await p.keyboard.press("Enter");
      await expect(p.getByRole("heading", { name: "Your trips" })).toBeVisible();
      const ritaState = await pre.storageState({ indexedDB: true });
      await pre.close();
      const r = await record("join", ritaState);
      const v = r.p;
      await v.goto("/");
      await expect(v.getByRole("heading", { name: "Your trips" })).toBeVisible();
      await v.waitForTimeout(1200);
      await tap(v.getByRole("button", { name: "Join trip" }));
      await v.waitForTimeout(600);
      await v.getByRole("textbox", { name: "Invite code" }).pressSequentially("710001", { delay: 200 });
      const dialog = v.getByRole("dialog", { name: "Join trip" });
      await expect(dialog.getByText("Lisbon weekend")).toBeVisible();
      await v.waitForTimeout(1200);
      await tap(dialog.getByRole("button", { name: "Rita" }));
      await v.waitForTimeout(700);
      await tap(dialog.getByRole("button", { name: "Join as Rita" }));
      await expect(v.getByRole("heading", { name: "Lisbon weekend" })).toBeVisible();
      await v.waitForTimeout(2500);
      await save(r);
    }

    // Live: Marco adds an expense on his phone; it appears on Bruno's at once.
    {
      const pre = await browser.newContext({ ...phone, storageState: SKIP_INSTALL });
      const p = await pre.newPage();
      await p.goto("/");
      await p.getByRole("textbox", { name: "What's your name?" }).fill("Marco");
      await p.keyboard.press("Enter");
      await p.getByRole("button", { name: "Join trip" }).click();
      await p.getByRole("textbox", { name: "Invite code" }).fill("710001");
      const dialog = p.getByRole("dialog", { name: "Join trip" });
      await dialog.getByRole("button", { name: "Marco" }).click();
      await dialog.getByRole("button", { name: "Join as Marco" }).click();
      await expect(p.getByRole("heading", { name: "Lisbon weekend" })).toBeVisible();
      const marcoState = await pre.storageState({ indexedDB: true });
      await pre.close();
      const [me, marco] = await Promise.all([record("live-me", state), record("live-marco", marcoState)]);
      await Promise.all([
        me.p.goto("/trip/readme-lisbon/expenses"),
        marco.p.goto("/trip/readme-lisbon/expenses"),
      ]);
      await expect(me.p.getByText("Dinner at Time Out Market")).toBeVisible();
      await expect(marco.p.getByText("Dinner at Time Out Market")).toBeVisible();
      const v = marco.p;
      await v.waitForTimeout(1500);
      await tap(v.getByRole("button", { name: "Add expense" }));
      await expect(v.getByRole("heading", { name: "New expense" })).toBeVisible();
      await v.waitForTimeout(500);
      await v.keyboard.type("6000", { delay: 220 });
      await v.waitForTimeout(400);
      await v.keyboard.press("Enter");
      await v.keyboard.type("Fado night", { delay: 90 });
      await v.keyboard.press("Enter");
      await v.waitForTimeout(600);
      await tap(v.getByRole("button", { name: "Save" }));
      await expect(me.p.getByText("Fado night").first()).toBeVisible();
      await v.waitForTimeout(3000);
      await Promise.all([save(me), save(marco)]);
    }

    // Gemini: the review appears on Home; check the guess, add them all.
    {
      const r = await record("gemini", state);
      const v = r.p;
      await v.goto("/");
      await v.evaluate((events) => {
        localStorage.setItem("evenly.devCalendar", JSON.stringify({ access: "granted", events }));
      }, GEMINI_EVENTS);
      await v.reload();
      const sheet = v.getByRole("dialog", { name: /^From Gemini/ });
      await expect(sheet).toBeVisible();
      await v.waitForTimeout(1800);
      await tap(sheet.getByRole("button", { name: /uber/ }));
      await v.waitForTimeout(1800);
      await tap(sheet.getByRole("button", { name: /^Add 3 expenses/ }));
      await v.waitForTimeout(1200);
      await tap(
        v
          .getByRole("main")
          .getByRole("button", { name: /Lisbon weekend/ })
          .first(),
      );
      await expect(v.getByText("museum tickets")).toBeVisible();
      await v.waitForTimeout(2500);
      await save(r);
    }
  } finally {
    await browser.close();
    await unseed();
  }
}

// ---------------------------------------------------------------- compose (filled in below)

const dataUrl = (file, type) => `data:${type};base64,${readFileSync(file).toString("base64")}`;
const FONT = dataUrl("public/fonts/hanken-grotesk.woff2", "font/woff2");
const ICON = dataUrl("public/icon.svg", "image/svg+xml");
const shot = (name) => dataUrl(join(RAW, `${name}.png`), "image/png");
// Screen aspect of the captures (Pixel 7 viewport).
const SCREEN = devices["Pixel 7"].viewport.height / devices["Pixel 7"].viewport.width;
const GIF = { w: 460, h: 600 };

const css = (dark) => `
  @font-face { font-family: Hanken; src: url(${FONT}) format("woff2"); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Hanken, sans-serif; background: transparent; -webkit-font-smoothing: antialiased;
    --fg: ${dark ? "#eceef2" : "#171a21"}; --muted: ${dark ? "#9aa2b1" : "#5d6472"};
    --card: ${dark ? "#1a1d24" : "#ffffff"}; --line: ${dark ? "#2a2f39" : "#e3e6ec"};
    --accent: #f2b233; --accent-fg: #1a1405; }
  .phone { position: relative; background: #101114; padding: var(--b); border-radius: calc(var(--w) * 0.14);
    box-shadow: 0 30px 60px -20px rgba(26, 20, 5, .45), 0 0 0 1.5px #2b2d33 inset; }
  .screen { width: var(--w); border-radius: calc(var(--w) * 0.11); overflow: hidden; background: #f6f7f9; }
  .bar { height: calc(var(--w) * 0.075); display: flex; align-items: center; justify-content: space-between;
    padding: 0 calc(var(--w) * 0.07); font-size: calc(var(--w) * 0.038); font-weight: 600; color: #171a21; }
  .bar i { display: inline-block; width: calc(var(--w) * 0.05); height: calc(var(--w) * 0.026);
    border-radius: 3px; background: #171a21; margin-left: 4px; }
  .screen img { display: block; width: 100%; }
`;
/** A phone frame around a capture; `hole` leaves the screen transparent (the GIF's video goes there). */
const phoneHtml = (w, img, hole = false) => `
  <div class="phone" style="--w:${w}px; --b:${Math.round(w * 0.035)}px; ${hole ? "background:transparent; box-shadow:none" : ""}">
    <div class="screen" style="${hole ? `background:transparent; box-shadow:0 0 0 ${Math.round(w * 0.035)}px #101114` : ""}">
      <div class="bar" style="background:#f6f7f9"><span>9:41</span><span><i></i><i></i></span></div>
      ${hole ? `<div class="hole" style="height:${Math.round(w * SCREEN)}px"></div>` : `<img src="${img}">`}
    </div>
  </div>`;

async function render(page, html, file, { dark = false, scale = 2 } = {}) {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.setContent(
    `<style>${css(dark)}</style><div id="root" style="display:inline-block">${html}</div>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator("#root")
    .screenshot({ path: file, omitBackground: true, scale: scale === 2 ? "device" : "css" });
}

async function compose() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  try {
    // Banner (also the social preview): 1280×640, phones bleeding off the bottom edge.
    const w = 230;
    await render(
      page,
      `<div style="width:1280px; height:640px; border-radius:28px; overflow:hidden; position:relative;
        background: radial-gradient(circle at 78% 30%, #f7c95f 0%, #f2b233 45%, #e9a51c 100%);">
        <div style="position:absolute; left:84px; top:0; bottom:0; display:flex; flex-direction:column;
          justify-content:center; width:440px; color:#1a1405">
          <div style="display:flex; align-items:center; gap:20px">
            <img src="${ICON}" style="width:84px; border-radius:20px; box-shadow:0 0 0 3px rgba(255,255,255,.55)">
            <div style="font-size:76px; font-weight:800; letter-spacing:-2px">Evenly</div>
          </div>
          <div style="font-size:31px; font-weight:600; line-height:1.25; margin-top:30px; letter-spacing:-.5px">
            Split trip expenses with friends.</div>
          <div style="font-size:31px; font-weight:600; line-height:1.25; opacity:.62; letter-spacing:-.5px">
            Everyone sees it live.</div>
          <div style="display:flex; gap:10px; margin-top:34px; font-size:18px; font-weight:600">
            ${["Web", "Android", "Offline-ready"]
              .map(
                (t) =>
                  `<span style="background:rgba(26,20,5,.1); padding:8px 16px; border-radius:99px">${t}</span>`,
              )
              .join("")}
          </div>
        </div>
        <div style="position:absolute; left:545px; top:120px; transform:rotate(-6deg)">${phoneHtml(w, shot("home"))}</div>
        <div style="position:absolute; left:770px; top:64px; z-index:2">${phoneHtml(w, shot("expenses"))}</div>
        <div style="position:absolute; left:995px; top:120px; transform:rotate(6deg)">${phoneHtml(w, shot("balances"))}</div>
      </div>`,
      join(OUT, "banner.png"),
    );

    // Gemini flow, light and dark (the README swaps them with <picture>).
    const sheetW = 380;
    const sheetH = Math.round(sheetW * SCREEN * 0.4);
    for (const dark of [false, true]) {
      const card = (inner, width) =>
        `<div style="width:${width}px; background:var(--card); border:1.5px solid var(--line); border-radius:22px;
          padding:22px 24px; box-shadow:0 12px 30px -16px rgba(0,0,0,.25)">${inner}</div>`;
      const label = (n, text) =>
        `<div style="font-size:15px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
          color:var(--muted); align-self:end">${n} · ${text}</div>`;
      const arrow = `<svg width="56" height="24" viewBox="0 0 56 24" style="margin:0 10px">
        <path d="M2 12h48m-10-9 10 9-10 9" fill="none" stroke="var(--muted)" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const sparkle = `<svg width="30" height="30" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="0" y1="0"
        x2="1" y2="1"><stop offset="0" stop-color="#4f8cff"/><stop offset="1" stop-color="#b36cf5"/></linearGradient>
        </defs><path d="M12 1c.8 5.6 5.4 10.2 11 11-5.6.8-10.2 5.4-11 11-.8-5.6-5.4-10.2-11-11C6.6 11.2 11.2 6.6 12 1z"
        fill="url(#g)"/></svg>`;
      await render(
        page,
        `<div style="display:grid; grid-template-columns:auto 76px auto 76px auto; grid-template-rows:auto auto;
          grid-auto-flow:column; row-gap:16px; align-items:center; padding:30px; color:var(--fg)">
          ${label(1, "You say")}${card(
            `<div style="display:flex; gap:12px; align-items:center; margin-bottom:12px">${sparkle}
              <span style="font-size:20px; font-weight:700">Gemini</span></div>
             <div style="font-size:24px; line-height:1.3; font-weight:500">“Add 40 to Lisbon for dinner, split with Ana”</div>`,
            300,
          )}
          <div></div>${arrow}
          ${label(2, "Gemini writes")}${card(
            `<div style="display:flex; gap:12px; align-items:center; margin-bottom:12px">
              <span style="width:14px; height:14px; border-radius:4px; background:var(--accent)"></span>
              <span style="font-size:20px; font-weight:700">Evenly calendar</span></div>
             <div style="font-family:ui-monospace, Consolas, monospace; font-size:17px; line-height:1.4; white-space:nowrap;
               background:${dark ? "#0f1115" : "#f6f7f9"}; border-radius:12px; padding:12px 14px">40 | dinner | ana | lisbon |</div>
             <div style="font-size:17px; color:var(--muted); margin-top:10px">Today · 7:12 PM</div>`,
            360,
          )}
          <div></div>${arrow}
          ${label(3, "You review in Evenly")}
            <div style="width:${sheetW}px; height:${sheetH}px; border-radius:22px;
              background:url(${shot("gemini")}) bottom / 100% auto no-repeat #fff; border:1.5px solid var(--line);
              box-shadow:0 12px 30px -16px rgba(0,0,0,.25)"></div>
        </div>`,
        join(OUT, `gemini-flow-${dark ? "dark" : "light"}.png`),
        { dark },
      );
    }

    // Feature GIFs: the videos inside phone frames (holes in an HTML layout) on the brand's soft yellow.
    const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
    const featureGif = async (name, phones, seconds) => {
      const w = phones.length > 1 ? 188 : 232;
      const frameFile = join(RAW, `${name}-frame.png`);
      const label = (text) =>
        text
          ? `<div style="font-size:15px; font-weight:700; color:#8a5a00; letter-spacing:.3px">${text}</div>`
          : "";
      await page.setViewportSize({ width: 1600, height: 1200 });
      await page.setContent(
        `<style>${css(false)}</style>
        <div id="root" style="width:${GIF.w}px; height:${GIF.h}px; display:flex; justify-content:center;
          align-items:center; gap:22px">
          ${phones
            .map(
              (p) => `<div style="display:flex; flex-direction:column; align-items:center; gap:12px">
                ${label(p.label)}${phoneHtml(w, "", true)}</div>`,
            )
            .join("")}
        </div>`,
      );
      await page.evaluate(() => document.fonts.ready);
      const holes = await page.locator(".hole").evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        }),
      );
      await page.locator("#root").screenshot({ path: frameFile, omitBackground: true, scale: "css" });
      const n = phones.length;
      const filter = [
        `color=c=0xfdf1d6:s=${GIF.w}x${GIF.h}:r=12:d=${seconds}[bg0]`,
        ...phones.map((_, i) => `[${i}:v]fps=12,scale=${holes[i].w}:${holes[i].h}:flags=lanczos[v${i}]`),
        ...phones.map(
          (_, i) => `[bg${i}][v${i}]overlay=${holes[i].x}:${holes[i].y}:eof_action=repeat[bg${i + 1}]`,
        ),
        `[bg${n}][${n}:v]overlay=0:0:shortest=1,split[s0][s1]`,
        `[s0]palettegen=max_colors=96:stats_mode=diff[p]`,
        `[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      ].join(";");
      execFileSync(ffmpeg, [
        "-y",
        "-loglevel",
        "error",
        ...phones.flatMap((p) => ["-ss", "0.8", "-i", join(RAW, `${p.video}.webm`)]),
        ...["-loop", "1", "-framerate", "12", "-t", String(seconds), "-i", frameFile],
        ...["-filter_complex", filter, "-t", String(seconds), "-loop", "0", join(OUT, `${name}.gif`)],
      ]);
    };
    await featureGif(
      "feature-live",
      [
        { video: "live-marco", label: "Marco adds an expense" },
        { video: "live-me", label: "…your phone shows it" },
      ],
      10.5,
    );
    await featureGif("feature-settle", [{ video: "settle" }], 6.6);
    await featureGif("feature-join", [{ video: "join" }], 8.2);
    await featureGif("feature-gemini", [{ video: "gemini" }], 8.8);

    // Big link buttons for the README.
    const button = (file, { bg, fg, sub, main, icon }) =>
      render(
        page,
        `<div style="display:flex; align-items:center; gap:16px; padding:14px 30px 14px 22px; border-radius:18px;
          background:${bg}; color:${fg}">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
          <div><div style="font-size:14px; font-weight:600; opacity:.7">${sub}</div>
            <div style="font-size:22px; font-weight:800; letter-spacing:-.3px">${main}</div></div>
        </div>`,
        join(OUT, file),
      );
    // Lucide "globe" and "download".
    await button("button-web.png", {
      bg: "#171a21",
      fg: "#ffffff",
      sub: "Try it in your browser",
      main: "Open the web app",
      icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    });
    await button("button-android.png", {
      bg: "#f2b233",
      fg: "#1a1405",
      sub: "Free APK",
      main: "Download for Android",
      icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    });
  } finally {
    await browser.close();
  }
}

if (step === "all" || step === "capture") await capture();
if (step === "all" || step === "compose") await compose();
