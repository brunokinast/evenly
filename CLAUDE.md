# Evenly

Trip expense splitting app, maintained entirely by Claude. The user doesn't write code: follow the process on your own and keep answers short.

## Where things are

- `specs/`: source of truth for behavior (acceptance criteria like `TRIP-3`) and `specs/design.md` for visuals.
- `docs/architecture.md`: folders, layers, the live-data pattern. `docs/data-model.md`: Firestore schema and rules design.
- `docs/decisions/`: ADRs (append-only; a changed decision gets a new ADR). Read `0001` before proposing any technology.
- `docs/rebuild-plan.md`: phases and current status.

## Clean room

This is a clean-room rebuild. Never read, search or reference the old app (`../evenly` or any copy of it), even if asked to "check how it worked". Everything needed is in `specs/`. If a spec is unclear, ask the user; don't guess from memory of the old app. `specs/migration-source.md` is for the migration script only.

## Rules

- Spec first: a behavior change updates the spec (and gets the user's OK) before code; spec and code change in the same commit. Tests name the AC IDs they cover.
- Only `src/data/` imports Firebase. `src/domain/` is pure TypeScript.
- Everything on screen is live: data comes from the shared listener hooks in `src/data/`. No one-off reads for on-screen data, no manual caches, no writing to local state after a write.
- Every write is one document or one batched write that the Security Rules validate. No Cloud Functions, no transactions.
- Money is integer cents; times are integer ms. Format with `Intl`, never by hand.
- Follow `specs/design.md` tokens; no literal colors.
- Previews go on a local LAN server for the user's phone, never published to claude.ai.

## Git

- Remote `origin` = github.com/brunokinast/evenly. Our base branch is **`evenly-v2`**: branch from it, merge back into it, push it. It will later replace `main`.
- `main` (and any other branch on the remote) holds the old app: never fetch, check out, diff, log or merge it. The remote is configured to fetch only `evenly-v2`; keep it that way.

## Workflow

Any feature, bug or change request goes through the `change-workflow` skill (`.claude/skills/change-workflow/`). Hooks: Prettier runs after each edit; the Stop hook runs `npm run check` and blocks until it passes.

## Commands

- `npm run check`: typecheck + lint + unit tests + rules tests (starts the Firestore emulator; needs Java).
- `npm run preview:lan`: emulators (data kept in `.emulator-data/`) + demo trip + dev server for the phone at `http://<LAN IP>:5173`. Demo trip: join with code **123456** (`scripts/seed-demo.mjs`; `npm run demo:reset` rewrites it). On the emulators the Profile sheet has "Reset account (testing)": new identity, back to Welcome. Without `VITE_FIREBASE_*` env vars the app always uses the emulators.
- `npm run emulators`: just the emulators, empty (used by e2e).
- `npm run e2e`: Playwright phone-viewport checks; screenshots in `test-results/`.
- `npm run build`: production build + APP-4 bundle budget (startup JS ≤ 350 kB gzip).

## Gotchas

- Call `await firebaseReady` (`src/data/firebase.ts`) before any Firebase plugin call.
- Tailwind colors are only the design tokens (`bg-surface`, `text-fg-muted`, …); default palette is disabled. Type roles: `text-amount|code|title|total|heading|row|body|caption|tag` (also listed in `src/lib/cn.ts` for tailwind-merge); no one-off sizes. Radii: `rounded-ctl|card|sheet`.
- e2e: `playwright.config.ts` starts the emulators and dev server itself; each test is a fresh browser = a fresh anonymous user. Tests run with reduced motion so screenshots never catch a sheet mid-slide.
- Sheets add one history entry (Android back). Move between screens only with the helpers in `src/app/nav.ts` (`openTrip`, `goHome`, `openExpenseForm`, `backToTrip`, `switchTab`): they first drop open sheets' entry (`leaveSheets()`), then push or pop, so Back never lands on a stale screen or sheet.
- PDF export is lazy (`import("./exportPdf")`); its chunks are listed in `ON_DEMAND` in `scripts/check-bundle-size.mjs`. New on-demand code must be added there.
- Rules tests reuse a Firestore emulator already running on :8080 (e.g. the LAN preview); otherwise they start one. They use project `demo-evenly-rules` so `clearFirestore()` never wipes the preview's `demo-evenly` data. Scripts that join the demo trip must remove themselves after (`seed-demo.mjs --remove-name`).
- People lists use `view.listed` (MEM-6: me first, then join order); computations keep `trip.members` order. Button pairs go in `ButtonRow`; one-field forms use `SubmitField`.
- Typecheck with `npm run typecheck` (`tsc -b`); `tsc --noEmit -p .` checks nothing here (the root tsconfig only has references).
- TypeScript is pinned to 6.0 (typescript-eslint support); Firebase JS SDK to 12 (Capacitor Firebase plugins).
