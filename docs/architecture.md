# Architecture

How the app is built. The stack and why: `docs/decisions/0001-stack-and-context.md`. Data and rules: `docs/data-model.md`.

## Big picture

One React app (Vite + TypeScript) runs as a website, as an installed PWA (iPhone) and inside Capacitor (Android). It talks straight to Firebase; there is no server of our own. Firestore Security Rules are the backend: they decide who can read and write and validate every write.

```
screens ──► components
   │
   ├──► data   (hooks + commands; the only code that touches Firebase)
   │      └──► domain
   └──► domain (pure logic: money, splits, balances, names)
   └──► i18n
```

## Folders

```
src/
  app/          entry, routes, providers (session gate, theme, i18n, offline banner, toasts)
  screens/      one folder per screen: welcome, home, trip (tabs), expense (add/edit form and its sheets), NotFound
  components/   shared app pieces (Button/ButtonRow, Sheet, TextField, SubmitField, MoneyInput, CodeInput, Avatar, Calendar, Wheel…)
  lib/          small helpers with no app knowledge (cn: class merging that knows the design tokens)
  domain/       pure TypeScript, no React, no Firebase: money, split, balances, settlements, member names, validation
  data/         Firebase setup, auth, live hooks, write commands
  i18n/         en.ts, pt-BR.ts, t(), number/date formatting
firestore.rules
tests/rules/    Security Rules tests (emulator)
e2e/            Playwright screenshot checks
```

Unit tests sit next to the file they test (`split.test.ts`).

## Layer rules (enforced by ESLint `no-restricted-imports`)

- Only `src/data/` imports Firebase packages (`@capacitor-firebase/*`, `firebase/*`).
- `src/domain/` imports nothing from React, `data/`, `screens/` or `components/`.
- `components/` doesn't import `data/` or `screens/`; screens compose components and data hooks.

## Firebase access

Through the Capacitor Firebase plugins on every platform: `@capacitor-firebase/authentication` and `@capacitor-firebase/firestore`. On Android they use the native Firebase SDKs; on the web they wrap the Firebase JS SDK. Why: ADR 0002.

- **Auth**: anonymous sign-in on first open (ID-1). The display name is the Auth profile's `displayName`, so a returning user goes straight to Home without waiting for a database read (ID-4, APP-4).
- **Offline cache** is on: reopening shows the last data instantly, then live updates arrive. The app is still online-only for actions (APP-6): writes are disabled while offline. On the web it is a single-tab cache (faster launches; a second tab of the site falls back to a memory cache, docs/performance.md R2).

## How live data reaches screens (the one pattern)

- Every piece of server data on screen comes from a **live listener**, exposed as a hook in `src/data/`: `useSession()`, `useMyTrips()`, `useTrip(tripId)`, `useExpenses(tripId)`.
- A hook returns `{ status: "loading" | "ready" | "gone", data }`. `gone` = the document doesn't exist or access was lost (deleted trip, removed member). Screens react to it (TRIP-7, TRIP-9, MEM-9).
- Listeners are shared and reference-counted by key (`src/data/live.ts`); an unused listener is kept 30 s so going back and forth doesn't re-listen, and a failed one ("gone") is dropped at once (one listener per path, however many components use it), built on `useSyncExternalStore`. That's the only cache: no manual caches, no one-off reads for on-screen data, no "refresh" (KI-1..3).
- Derived values (balances, settlements, display names, "split between all") are computed from hook data with `src/domain/` functions during render (memoized when needed), never stored.
- **One exception**: the Auth profile (display name) has no change listener, so `setDisplayName` re-reads the current user after `updateProfile` and publishes it to `useSession()`.
- **Cache gotcha**: when a trip listener loses access (trip deleted, member removed), Firestore's offline cache can keep the old trip and Home's query may keep showing it. `useMyTrips` hides a trip whose listener reported "gone" while the query still returns that same version (`src/data/trips.ts`).
- **Rename in all trips** (ID-5): `setDisplayName` takes Home's live list, or one read of the same query when Home never loaded (a name entered on Welcome by a user who already has trips, e.g. migrated). The read feeds a write, never the screen.
- **Join preview**: looking up a code (`lookupInvite`) is a one-off read by design: the attempt must be counted first (INV-9), and the preview is only shown in the Join sheet.
- **Writes** are plain async functions in `src/data/` (`createTrip`, `joinTrip`, `saveExpense`…). They don't update local state: the listener delivers the change, just as it does for other members. Screens show a busy state only for writes that wait (below), and errors.
- **Local-first writes** (EXP-8, APP-9): Firestore applies a write to its local cache at once (listeners show it in a few ms) and syncs it in the background; the returned promise settles only when the server answers. So screens don't await writes that only change existing documents: they go on at once and `.catch` a refusal into a notice ("Couldn't save…"). Writes that need the server first still wait: creating a trip (it can't be opened before the server has it), joining, invite codes, deleting a trip (reads the expenses on the server first).
- **Web launch copy** (APP-10, ADR 0007): `launchCopy.ts` keeps my uid, name and Home's list in localStorage on the web; the session and Home start from it while Auth re-checks the login, and Auth's answer confirms or discards it.
- **Warm listeners**: `warmLive` starts a key's shared listener before a screen uses it (Home starts a trip's listeners on touch-down, F6); unused, it ends after the usual idle time.

## Domain logic (`src/domain/`)

Pure functions with unit tests named after the acceptance criteria:

- money: cents parsing for the fill-from-the-right input (EXP-2).
- split: equal shares with the leftover-cents rule (BAL-2), custom split fill (EXP-12).
- balances and settlements (BAL-1, BAL-3, BAL-7).
- member display names and disambiguation (MEM-4, KI-11).
- validation shared by forms (ID-3, TRIP-2, EXP-1, MEM-2).

## Screens and navigation

- Routes (wouter, ~2 kB): `/` Home, `/trip/:tripId` (tab in the URL: `/expenses`, `/balances`, `/members`), `/trip/:tripId/expense/new`, `/trip/:tripId/expense/:expenseId/edit`. Welcome is shown by the session gate, not a route. Unknown or inaccessible trip → Trip not found (TRIP-9).
- Bottom sheets are components opened by screen state, not routes (`src/components/Sheet.tsx`, a native `<dialog>`). Android back closes the open sheet first: while any sheet is open there is one extra history entry, removed when the last sheet closes.
- Device-only state (theme, install availability, keyboard height) lives in small stores in `src/app/` (`theme.ts`, `install.ts`, `viewport.ts`), not in `src/data/`.
- Hosting rewrites every path to `index.html`.

## i18n and formatting

- `en.ts` is the source dictionary; `pt-BR.ts` must have the same keys (a TypeScript type checks it). `t(key, vars)`; `tn()` picks `.one` for exactly 1 and `.other` otherwise (both languages' needs; Intl's Portuguese rules would call 0 singular). No i18n library.
- Language: device language, fallback English (APP-1). Amounts: `Intl.NumberFormat` in the user's language with the trip currency's symbol (EXP-2, KI-8). Dates and times: `Intl.DateTimeFormat`.

## Theme and design

Tokens from `specs/design.md` as CSS variables, mapped into Tailwind. Theme light/dark/system stored in `localStorage` (APP-2). Hanken Grotesk self-hosted. Lucide icons.

## PWA and performance (APP-3, APP-4)

- `vite-plugin-pwa`: manifest + service worker that precaches the app shell, so repeat opens don't hit the network for code. On-demand code (PDF export and its fonts, the `?perf` panel) isn't precached: it's cached on first use (F7). `index.html` preloads the Firebase SDK chunks so they download alongside the main chunk (F3).
- Budget: JavaScript loaded at startup ≤ 350 kB gzipped, checked by `scripts/check-bundle-size.mjs` after `vite build`. It counts every chunk, since the Firebase plugins import their SDKs dynamically right at startup. (Raised from 250 kB in the identity slice: Firestore with its offline cache is ~153 kB and Auth ~29 kB on their own; 350 kB still downloads in well under a second on 4G and repeat opens come from the service worker.) Heavy, rarely used code (PDF export) is loaded only when used and listed in the script's `ON_DEMAND`.
- First paint shows skeletons in the real layout; never a full-screen spinner after it.

## Android (Phase 5)

Capacitor wraps the same build (`capacitor.config.ts`, `android/`) and uses the native Firebase SDKs, so later Kotlin code (Gemini) acts as the same signed-in user. App ID, signing, build types, Back and sharing: ADR 0003.

- `npm run android:dev`: debug APK ("Evenly Dev") against the emulators on this PC, installed on a connected phone or Android emulator. `npm run android:release`: signed release APK in `android/evenly.apk`, published as a GitHub Release asset (ADR 0005).
- The WebView page is `https://localhost`, so `location.hostname` can't find the emulators: the debug build bakes in `VITE_EMULATOR_HOST` (this PC's LAN IP).
- Edge to edge: Capacitor's SystemBars keeps `env(safe-area-inset-*)` correct; `src/app/theme.ts` sets the bar icons' style from the app theme and hands the choice to `AppThemePlugin.java` (our one native plugin, registered in `MainActivity`), which sets the app's night mode so the next launch screen matches (Android 12+). The keyboard resizes the WebView like Chrome does, so `--kb` stays 0 there.
- Launcher icons (white coin on marigold) and the launch-screen logo (`drawable[-night]-xxxhdpi/splash_icon.png`, in `--fg`) come from `public/icon.svg` and `public/logo.svg` (`scripts/make-icons.mjs`).

## Testing

- **Vitest**: domain unit tests; data and components where useful.
- **Rules tests**: `@firebase/rules-unit-testing` against the Firestore emulator, one test per rule case in `docs/data-model.md`. Needs Java (emulator requirement).
- **Playwright**: phone-viewport screenshots against the dev server + emulators, compared with `specs/design.md`; includes the two-browser live join check (INV-6).
- Tests name the AC IDs they cover, e.g. `it("BAL-7 worked example", …)`.

## Deploy

Firebase Hosting (same project `evenly-app-6f5f2`, same site, so web users keep their identity) + `firestore.rules`. Spark plan only.
