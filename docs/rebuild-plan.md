# Evenly rebuild plan

## Context

Evenly (trip expense splitting app) was vibe coded in Flutter and is buggy, slow, inconsistent and ugly. Examples: you join a trip and it only appears after a restart, and loading is slow. We rebuild it as a clean implementation in a new repo. The specs describe _intended_ behavior. The old repo is used only to learn **what** the app does, never **how** it does it. Its architecture, naming, patterns and data model are not carried over. Guiding principle: **KISS**, with as few systems and dependencies as possible.

Old app (≈9k lines of Dart) features: anonymous auth, trips with a currency, 6-digit invite codes, expenses with payer and participants, equal split, balances, optimized settlements, PDF export, voice commands through Google Assistant (Android), and EN / PT-BR localization.

## Decided stack

- **React + Vite + TypeScript**: one UI codebase.
- **Tailwind** with the design tokens only, and our own small components (shadcn/ui was planned, then not needed).
- **Firebase** (same project): Hosting, Firestore, Auth. Free Spark plan, so no Cloud Functions. Permissions and integrity are enforced by Security Rules on single writes and batched writes (no transactions, ADR 0002).
- **PWA** (`vite-plugin-pwa`): installs on iPhone.
- **Capacitor**: native Android APK. Sign-in goes through the native Firebase SDK (`@capacitor-firebase/authentication`) so Kotlin can act as the user later.
- **Vitest + Firebase Emulator**: tests for logic and Security Rules. Playwright (already connected) for screenshot checks.
- Deferred: Gemini via a Kotlin AppFunctions service.

## Phases (each ends with your approval)

### 0. Repo setup

- Create `C:\Users\bruno\Documents\git\evenly-v2` and run `git init`.
- Copy this plan to `docs/rebuild-plan.md`, so every future session (and a fresh session per phase, as Anthropic's docs recommend) can pick up where the last one stopped.

### 1. Spec extraction → `C:\Users\bruno\Documents\git\evenly-v2\specs\`

Read the old repo for behavior only. Write:

- `features/*.md`: one per feature (identity, trips, invites/joining, expenses, balances & settlements, PDF export, localization, voice/Gemini as a future spec). Each has a plain-language description, user flows and testable acceptance criteria (Given/When/Then). No technical terms from the old app.
- `open-questions.md`: ambiguous or accidental-looking behavior, for you to decide.
- `known-issues.md`: bugs found, so the rebuild deliberately avoids them.
- `migration-source.md`: the old Firestore shape, used **only** by the migration script.

A verification pass re-checks every spec against the old code, to catch anything invented or missed.

### Status (2026-10-28)

- Phases 0–1 done (specs reviewed and decided by the user; see `specs/open-questions.md`).
- **Clean room from here on**: phases 2+ run in fresh sessions opened in this repo, with no access to the old app (enforced by `.claude/settings.json` deny rules and `CLAUDE.md`). Exception: Phase 6 migration uses only `specs/migration-source.md`.
- Phase 2 done (2026-10-27): `specs/design.md` + `specs/design-mockup.html` (view it locally, see design.md). The mockup review changed some specs (expense details sheet, date + time, custom split auto-fill, grouped suggested payments, Invite in the trip top bar).
- Previews are served on the local network, never published to claude.ai (user preference).
- Phase 3 done (2026-10-27): `docs/architecture.md`, `docs/data-model.md`, ADR 0002 (data layer via Capacitor Firebase plugins, no transactions), updated `CLAUDE.md`. In review the user chose: a member who leaves or is removed becomes a guest (MEM-5, INV-11).
- **User preference: a good, fast structure beats compatibility with the old app.** Migrating old data (Phase 6) is optional and never shapes the new model.
- Phase 3b + scaffold done (2026-10-27, branch `phase-4-scaffold`): Vite 8, React 19, TS 6.0, Tailwind 4 with design tokens, Capacitor Firebase plugins (emulators in dev), PWA, Vitest (unit + rules on the emulator), Playwright, ESLint layer rules, Prettier/Stop hooks, `change-workflow` skill, GitHub Actions CI. `firestore.rules` is deny-all until each slice adds its rules.
- Code lives on GitHub `brunokinast/evenly`, branch `evenly-v2` (only that branch is fetched; `main` is the old app, off limits). `evenly-v2` replaces `main` at cutover (Phase 6).
- Slice 1 identity (2026-10-27, branch `identity`): Welcome, session gate, Unable to connect, Profile sheet (name, theme, install), Home skeleton with the install card; EN + PT-BR dictionary. Spec changes approved by the user: ID-3 max 50, ID-9, APP-3 install in Profile (APK on Android once it exists), APP-7 install card, APP-8 overflow. Startup JS budget raised to 350 kB (see architecture).
- Slices 2–7 (2026-10-28, branch `app-slices`; the user asked to build all slices and test end to end at the end): trips, invites/joining, members, expenses, balances/settlements, PDF export, EN + PT-BR, offline banner. Full Security Rules with emulator tests (one per data-model case), domain unit tests, and Playwright flows with two and three users for the live behavior (INV-6, EXP-3, MEM-9, TRIP-7). PNG app icons for install. No spec changes.
- Welcome redesign and test setup (2026-10-28, branch `welcome-and-demo`, asked by the user): centered Welcome with icon, title and a → button in the field (design.md "Welcome"); "=" app icon; `npm run preview:lan` with a persistent demo trip (code 123456); testing-only account reset on the emulators.
- Design pass (2026-10-28, branch `design-pass`, asked by the user): two-row trip header with the icon, centered trip total, button sizes and never-cut labels (`ButtonRow`), one text-field style and `SubmitField`, ⋯ menu as a list, one primary per screen, toast above the Add button, keyboard closes after a found code, MEM-6 me-first order in every list (BAL-6 changed), redesigned PDF. Fixed: rules tests wiped the preview data (now their own project).
- Design pass 2 (2026-10-28, branch `design-pass-2`, asked by the user): Balances tab order (balances, your payments, other payments), field buttons follow the field's curve, cleaner Expense details (centered amount, "Paid by", shares only, Edit at the bottom), Edit expense opens without the keyboard (EXP-9), Add expense button only on the Expenses tab.
- Brand (2026-10-28, branch `brand`, designed with the user from their old custom icon): split-coin app icon and a logo (coin + "Evenly" in Nunito 800 as outlines); PDF header uses the logo (design.md "Brand"). Same branch: Welcome shows the logo (W2), Profile/Edit expense open without the keyboard, Enter in New trip and Add expense only closes the keyboard, creating a trip stays on Home, the empty amount keeps the caret at the end, and the Date and time sheet uses the app's own calendar, time wheels and time shortcuts instead of Android's dialogs (EXP-17).
- Repo pass (2026-10-28, branch `repo-pass`, a fresh-agent audit): trip delete also removes malformed expenses; sign-in "Try again" recovers from a failed start (ID-6); only a rules denial reads as "too many attempts"; owner edits in the rules are limited to adding/deleting a guest or making an app user a guest, named in `editedMember` (no renaming others, no re-linking uids); member names 2–50 in the rules (ID-3); invites can't outlive about an hour; two new type roles (`heading`, `code`) replace one-off sizes; dead keys/config/deps removed; docs synced; CI runs the e2e suite.
- The user's end-to-end check on the phone passed (2026-10-28).
- Phase 5 Android (2026-10-28, branch `android`, merged and pushed): Capacitor Android project, app ID `br.com.kinast.evenly` registered in Firebase (**the old app uses this same ID** with another key, so it must be uninstalled first; see the Phase 6 handoff), a new release key, debug build "Evenly Dev" against the LAN emulators, release build with the real config (ADR 0003). Done and checked on the Android emulator (API 36): native anonymous sign-in, join, live lists and live updates, offline cold start from the cache with the banner, a trip deleted while open goes Home (TRIP-7) and leaves Home (the lost-trip check now compares sorted-key JSON), Back closes sheets/screens and leaves the app on Home, Back with unsaved expense changes asks "Discard changes?" (expenses flow 5, also in browsers; e2e), PDF and invite open Android's share sheet (PDF-4), status bar icons follow the app theme, no service worker in the APK, a WebView reload recovers (native SDKs already set up), launcher icons from `icon.svg` (white coin on marigold), launch screen = the logo (coin and name) in `--fg` on `--bg` following the in-app theme (APP-2, light and dark checked).
- Phase 5 still open:
  1. Install `android/evenly.apk` on the user's phone and try it against the real project. Needs the new rules deployed to the real project first (Phase 6 decision: the old app still uses it).
  2. Install: set `APK_URL` in `src/app/install.ts` once the APK is on Hosting (Phase 6 deploy).
  3. PDF fonts: jsPDF's Helvetica is Latin only; names in other scripts need an embedded font.
- Phase 6 step 1 (2026-10-28, branch `migration`): `scripts/migrate.ts` and `scripts/relink.ts` (run with `npx tsx`; `firebase-admin` uses the `firebase login` credentials, no key file). Unit tests for the mapping and relink; checked on the emulators with a synthetic old-shape backup: restore, dry run, apply (one trip kept, the empty one and `users` deleted, balances read back), relink of the old owner to a new app user, and the trip showed live on Home and in the trip screen. Next: the dry run on the real project (read only), with the user's OK.
- **Cutover done (2026-10-28, branch `cutover`)**: the migration ran on the real project (backup `backups/evenly-app-6f5f2-2026-10-28T14-09-32-583Z.json`, local only): Gramado (13 expenses) and Porto de Galinhas (43) migrated with their old UIDs, 3 empty trips and `users` deleted, balances read back. New rules, indexes and the web app deployed to https://evenly-app-6f5f2.web.app. The old app is locked out.
  - Firebase Hosting refuses executable files (`.apk`) on the Spark plan, so the APK is a GitHub Release asset instead (ADR 0005): release `v1.0`, and `APK_URL` points at `releases/latest/download/evenly.apk`. The install note says to uninstall the old app first (ADR 0004). `evenly.kinast.com.br` is a custom domain of the same Hosting site, so it switched with the deploy.
  - CI was failing on a real race (Back right after a sheet closed skipped the "Discard changes?" guard); fixed in `Sheet.tsx`.
  - Duda relinked (2026-10-28): old `JQETQzGn…` → new `c3UayD2m…` (Android app) in both trips. Bruno's browser kept the old web sign-in (same origin), so Bruno is already `SqM5…`; relink Bruno only if they move to the APK.
  - Fixes after cutover: a Welcome name now reaches existing trips (ID-5, Android 1.1); the APK link opens in a new tab.
  - Still to do: steps 3–6 of the handoff (check on the phone, `main` on GitHub, PDF font, relink the two old users).
- Still untested (no automated test yet): EXP-8 failure path, PDF-2 and PDF-5, APP-5 (accessibility). BAL-4 and INV-12 are absences by design.

### 2. Design → `specs/design.md` + a mockup page

- Design tokens (color, type, spacing, radius), component rules and mobile patterns (bottom tab bar, bottom sheets, safe areas, tap targets).
- Mockups of Home, Trip and Add Expense, published as a page you can open on your phone.

### 3. Architecture → `architecture.md`, `data-model.md`, `CLAUDE.md`

- A new Firestore data model designed from the specs: live listeners only, cheap reads, rule-friendly, writable from Kotlin later.
- A Security Rules design, including the invite-code flow.
- Folder structure, and how live data reaches screens (one pattern, no manual caches).
- CLAUDE.md: a short set of project rules for every AI session.

### 3b. AI-maintenance guardrails (set up with the scaffold)

The repo is maintained only by Claude, so quality has to come from checks that pass or fail, not from good intentions. This follows Anthropic's official Claude Code best practices: keep CLAUDE.md short, give Claude a check to run, and put the rules that can't have exceptions in hooks.

- **Living specs**: every feature request updates or adds a spec (acceptance criteria) _first_, and you approve it. The spec and the code change in the same commit. Tests name the criteria they cover.
- **ADRs** (`docs/decisions/NNNN-*.md`): short and append-only. Only for durable decisions (e.g. "no Cloud Functions", "screens never import Firebase directly"). A changed decision gets a new record that supersedes the old one.
- **CLAUDE.md under 200 lines**: commands, conventions the code can't show, gotchas, and anything corrected twice. Rules for one part of the code go in `.claude/rules/` with `paths:` filters.
- **Enforced checks** (kept to a few):
  - A `Stop` hook runs typecheck + lint + tests and blocks "done" until they pass.
  - A `PostToolUse` hook runs Prettier after each edit.
  - ESLint `no-restricted-imports` enforces layer boundaries (e.g. only `src/data/` may import Firebase). It's built into ESLint, so no extra tool.
- **Nothing to remember for the user.** You open Claude in the repo and ask in plain words ("add X", "Y is broken"). Everything below starts automatically:
  - A **`change-workflow` skill that Claude starts by itself** (its description matches any feature, bug or change request; it is not a slash command). Its steps:
    1. Read the relevant specs and ADRs.
    2. Propose spec changes in plain language and **ask the user to confirm the behavior** (the only question asked).
    3. Write failing tests from the acceptance criteria.
    4. Implement, reusing existing code.
    5. Run a Playwright screenshot check.
    6. Review the diff against the spec in a fresh subagent ("skip style"), plus a reuse/simplify pass.
    7. Update the specs, ADRs and CLAUDE.md.
    8. Commit on a branch and show the evidence (test output, screenshots).
    9. Merge when the user says OK.
  - CLAUDE.md has one line pointing at that skill, as a backup.
  - The hooks (checks + format) run whatever Claude decides, so "done" always means checks pass.
- **CI**: GitHub Actions runs the same checks on every push, as a safety net.
- **Self-maintenance**: the workflow's last step includes a short cleanup: remove dead code, fix outdated instructions, and add any lesson learned to CLAUDE.md. No periodic manual commands.

### 4. Build in vertical slices

Scaffold first (Vite, TS, Tailwind, shadcn, Firebase, Vitest, emulator, PWA). Then slices in this order: identity, then trips, then invites/joining, then expenses, then balances/settlements, then PDF export, then localization. Each slice ships with:

- Unit tests for the logic (e.g. settlement math).
- Emulator tests for the Security Rules.
- A Playwright screenshot check against `design.md`.

### 5. Android (Capacitor)

- Wrap the app with Capacitor and use native auth.
- Build the APK in Android Studio (installed at this point).

### 6. Migration & cutover

- A script that restructures existing Firestore data into the new model. Test it against an export first.
- Deploy to the same Hosting site.

#### Phase 6 handoff (written 2026-10-28 for a fresh session)

Decided by the user (2026-10-28):

- **Migrate old data**, but **only trips with content**: a trip with at least one expense. Trips with no expenses are not migrated; they're deleted with the old leftovers (they stay in the JSON backup). The mapping is in `docs/data-model.md` "Migration"; the old shape is in `specs/migration-source.md` (the only allowed source about the old app).
- **Only two people used the old app, and they'll come later.** Migrate now, keeping their old UIDs; linking them to their new accounts is the **last step**, after everything else, whenever they install the new app. Keep our current release key (`android/release.jks`); the old key isn't needed.

Facts found at handoff (verify, don't assume):

- The old Android app's package is **`br.com.kinast.evenly`**, the same ID as the new app, signed with another key. ADR 0003 says the old ID was `com.example.evenly`; that was wrong (probably only its Firebase registration). The Android emulator AVD (`Medium_Phone_API_36.1`) has the old app installed (0.1.0, versionCode 1). Consequence: Android refuses to install the new APK over it, so **the old app must be uninstalled first** (say so in the install note and to the two users). Record this in ADR 0004 (corrects ADR 0003 decision 1's fact; the decisions stand).

Steps (each needs the user's OK before touching the real project):

1. **Migration script** `scripts/migrate.ts` (done, see status) (Admin SDK, local, with the user's credentials; `firebase-admin` as a devDependency):
   - Dry-run by default: read everything, write a JSON backup to a gitignored folder, print what it would do: trips kept vs dropped, and each trip's members with their old UID and name.
   - Old app members stay app members with their **old UID** (name from `users/{uid}.displayName`), so owners and `createdBy` stay valid and the later link is a plain UID swap. Until then nobody can sign in as them.
   - `--apply` writes. Each trip is migrated in one batch: the new trip doc with its members and expenses, then the old subcollections deleted. Afterwards it deletes the dropped trips and `users`.
   - Test first against the emulators loaded with the backup JSON: unit tests for the mapping (pure functions), then compare per-trip balances old vs new (the domain functions in `src/domain/`) and look at the trip lists in the app (`npm run android:dev` or the LAN preview).
2. **Cutover**, with the user:
   - Backup and migration with `--apply`.
   - Set `APK_URL` in `src/app/install.ts`, `npm run android:release`, `firebase deploy` (rules, indexes, hosting; the predeploy builds and adds `/evenly.apk`). The new rules lock the old app out.
3. **Check on the user's phone**: the user's own old trips show only after their link (step 6), so check them on the emulators with the backup, and check the real site and APK with a new trip.
4. **GitHub**: only with the user's explicit OK, make `evenly-v2` the new `main`. That's the one time `main` is touched; ask how they want it (replace or merge) and update `CLAUDE.md` "Git" after.
5. Loose ends: an embedded PDF font for names in non-Latin scripts (Phase 5 open item 3). Update this status section and the docs.
6. **Last, whenever the two old users come** (the user says when): they uninstall the old app, install the new one and enter their names. Then `npx tsx scripts/relink.ts oldUid=newUid …` (`--users` lists the Auth users) (dry run first) swaps each old UID for the new one in every trip it appears in (member `uid`, `memberUids`, `memberIdsByUid` keys, `ownerUid`, expenses' `createdBy`), one batch per trip. List the Auth users (Admin SDK `listUsers`, newest first, with names) and confirm the pairs with the user before applying. The new identity must not already be a member of that trip (if it is, ask the user).

### 7. Gemini (later)

- A Kotlin AppFunctions service, e.g. `addExpense`, writing through the native Firestore SDK.
- A confirmation notification after each action.

## Migration risks to resolve in Phase 1/3

- **Anonymous identities.** Users are identified only by their anonymous UID, which lives on their device. They keep their trips only if:
  - Web: same Firebase project and the **same Hosting origin**.
  - Android: **same applicationId and signing key**, installed as an update.

  I'll check whether you still have the Android signing key. I'll also propose optional account linking (e.g. Google) so identity survives a device change.

- **Voice commands.** The old Google Assistant voice commands no longer work: Assistant was removed from Android in Sept 2026. Gemini replaces them in Phase 7.
- **Old and new apps writing at the same time.** If the data model changes, an old APK still in use would write data in the old format. The cutover has to be a single switch: migrate the data, deploy the web app, and publish the APK update together. The old app should also be blocked from writing, e.g. through a Security Rules version gate.

## Verification

- After phases 1–3: you review the docs and mockups.
- After phase 4, per slice: `vitest` passes (logic + rules against the emulator), and Playwright screenshots of the web app on a phone-sized viewport.
- A two-browser live-update test: join a trip in browser B and see it on Home instantly, with no reload.
- After phase 5: install the APK on your Android 17 phone.
- After phase 6: run the migration script on an export copy, then compare balances per trip between the old and new apps.
