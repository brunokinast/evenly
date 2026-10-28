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
- `npm run emulators` (auth + Firestore, project `demo-evenly`) and `npm run dev:lan`: local app for the phone at `http://<LAN IP>:5173`. Without `VITE_FIREBASE_*` env vars the app always uses the emulators.
- `npm run e2e`: Playwright phone-viewport checks; screenshots in `test-results/`.
- `npm run build`: production build + APP-4 bundle budget (startup JS ≤ 350 kB gzip).

## Gotchas

- Call `await firebaseReady` (`src/data/firebase.ts`) before any Firebase plugin call.
- Tailwind colors are only the design tokens (`bg-surface`, `text-fg-muted`, …); default palette is disabled. Type roles: `text-amount|title|total|row|body|caption|tag`. Radii: `rounded-ctl|card|sheet`.
- e2e: `playwright.config.ts` starts the emulators and dev server itself; each test is a fresh browser = a fresh anonymous user. Tests run with reduced motion so screenshots never catch a sheet mid-slide.
- TypeScript is pinned to 6.0 (typescript-eslint support); Firebase JS SDK to 12 (Capacitor Firebase plugins).
