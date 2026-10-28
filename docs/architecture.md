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
  screens/      one folder per screen: welcome, home, trip (tabs), expense-form, not-found
  components/   ui/ = shadcn primitives; the rest = shared app pieces (Sheet, MoneyInput, CodeInput, Avatar, AmountText…)
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
- **Offline cache** is on: reopening shows the last data instantly, then live updates arrive. The app is still online-only for actions (APP-6): writes are disabled while offline.

## How live data reaches screens (the one pattern)

- Every piece of server data on screen comes from a **live listener**, exposed as a hook in `src/data/`: `useSession()`, `useMyTrips()`, `useTrip(tripId)`, `useExpenses(tripId)`.
- A hook returns `{ status: "loading" | "ready" | "gone", data }`. `gone` = the document doesn't exist or access was lost (deleted trip, removed member). Screens react to it (TRIP-7, TRIP-9, MEM-9).
- Listeners are shared and reference-counted by key (one listener per path, however many components use it), built on `useSyncExternalStore`. That's the only cache: no manual caches, no one-off reads for on-screen data, no "refresh" (KI-1..3).
- Derived values (balances, settlements, display names, "split between all") are computed from hook data with `src/domain/` functions during render (memoized when needed), never stored.
- **Writes** are plain async functions in `src/data/` (`createTrip`, `joinTrip`, `saveExpense`…). They don't update local state: the listener delivers the change, just as it does for other members. Screens show busy state and errors (EXP-8).

## Domain logic (`src/domain/`)

Pure functions with unit tests named after the acceptance criteria:

- money: cents parsing for the fill-from-the-right input (EXP-2).
- split: equal shares with the leftover-cents rule (BAL-2), custom split fill (EXP-12).
- balances and settlements (BAL-1, BAL-3, BAL-7).
- member display names and disambiguation (MEM-4, KI-11).
- validation shared by forms (ID-3, TRIP-2, EXP-1, MEM-2).

## Screens and navigation

- Routes (wouter, ~2 kB): `/` Home, `/trip/:tripId` (tab in the URL: `/expenses`, `/balances`, `/members`), `/trip/:tripId/expense/new`, `/trip/:tripId/expense/:expenseId/edit`. Welcome is shown by the session gate, not a route. Unknown or inaccessible trip → Trip not found (TRIP-9).
- Bottom sheets are components opened by screen state, not routes. Android back closes the open sheet first.
- Hosting rewrites every path to `index.html`.

## i18n and formatting

- `en.ts` is the source dictionary; `pt-BR.ts` must have the same keys (a TypeScript type checks it). `t(key, vars)` with plural forms via `Intl.PluralRules`. No i18n library.
- Language: device language, fallback English (APP-1). Amounts: `Intl.NumberFormat` in the user's language with the trip currency's symbol (EXP-2, KI-8). Dates and times: `Intl.DateTimeFormat`.

## Theme and design

Tokens from `specs/design.md` as CSS variables, mapped into Tailwind. Theme light/dark/system stored in `localStorage` (APP-2). Hanken Grotesk self-hosted. Lucide icons.

## PWA and performance (APP-3, APP-4)

- `vite-plugin-pwa`: manifest + service worker that precaches the app shell, so repeat opens don't hit the network for code.
- Budget: initial JavaScript ≤ 250 kB gzipped (Firebase is most of it), checked by a small script after `vite build`. Heavy, rarely used code (PDF export) is loaded only when used.
- First paint shows skeletons in the real layout; never a full-screen spinner after it.

## Android (Phase 5)

Capacitor wraps the same build and uses the native Firebase SDKs, so later Kotlin code (Gemini) acts as the same signed-in user. Keeping the applicationId `br.com.kinast.evenly` and the old release key would also keep existing users' sessions; that's nice to have, not required.

## Testing

- **Vitest**: domain unit tests; data and components where useful.
- **Rules tests**: `@firebase/rules-unit-testing` against the Firestore emulator, one test per rule case in `docs/data-model.md`. Needs Java (emulator requirement).
- **Playwright**: phone-viewport screenshots against the dev server + emulators, compared with `specs/design.md`; includes the two-browser live join check (INV-6).
- Tests name the AC IDs they cover, e.g. `it("BAL-7 worked example", …)`.

## Deploy

Firebase Hosting (same project `evenly-app-6f5f2`, same site, so web users keep their identity) + `firestore.rules`. Spark plan only.
