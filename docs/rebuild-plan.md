# Evenly rebuild plan

## Context

Evenly (trip expense splitting app) was vibe coded in Flutter and is buggy, slow, inconsistent and ugly. Examples: you join a trip and it only appears after a restart, and loading is slow. We rebuild it as a clean implementation in a new repo. The specs describe _intended_ behavior. The old repo is used only to learn **what** the app does, never **how** it does it. Its architecture, naming, patterns and data model are not carried over. Guiding principle: **KISS**, with as few systems and dependencies as possible.

Old app (≈9k lines of Dart) features: anonymous auth, trips with a currency, 6-digit invite codes, expenses with payer and participants, equal split, balances, optimized settlements, PDF export, voice commands through Google Assistant (Android), and EN / PT-BR localization.

## Decided stack

- **React + Vite + TypeScript**: one UI codebase.
- **Tailwind + shadcn/ui**: consistent design, accessible HTML.
- **Firebase** (same project): Hosting, Firestore, Auth. Free Spark plan, so no Cloud Functions. Permissions and integrity are enforced by Security Rules, plus transactions and batched writes.
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

### Status (2026-10-27)

- Phases 0–1 done (specs reviewed and decided by the user; see `specs/open-questions.md`).
- **Clean room from here on**: phases 2+ run in fresh sessions opened in this repo, with no access to the old app (enforced by `.claude/settings.json` deny rules and `CLAUDE.md`). Exception: Phase 6 migration uses only `specs/migration-source.md`.
- Phase 2 done (2026-10-27): `specs/design.md` + `specs/design-mockup.html` (view it locally, see design.md). The mockup review changed some specs (expense details sheet, date + time, custom split auto-fill, grouped suggested payments, Invite in the trip top bar).
- Previews are served on the local network, never published to claude.ai (user preference).
- Phase 3 done (2026-10-27): `docs/architecture.md`, `docs/data-model.md`, ADR 0002 (data layer via Capacitor Firebase plugins, no transactions), updated `CLAUDE.md`. In review the user chose: a member who leaves or is removed becomes a guest (MEM-5, INV-11).
- **User preference: a good, fast structure beats compatibility with the old app.** Migrating old data (Phase 6) is optional and never shapes the new model.
- Phase 3b + scaffold done (2026-10-27, branch `phase-4-scaffold`): Vite 8, React 19, TS 6.0, Tailwind 4 with design tokens, Capacitor Firebase plugins (emulators in dev), PWA, Vitest (unit + rules on the emulator), Playwright, ESLint layer rules, Prettier/Stop hooks, `change-workflow` skill, GitHub Actions CI. `firestore.rules` is deny-all until each slice adds its rules.
- Code lives on GitHub `brunokinast/evenly`, branch `evenly-v2` (only that branch is fetched; `main` is the old app, off limits). `evenly-v2` replaces `main` at cutover (Phase 6).
- Next: slice 1, identity (ID-*), then trips.

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
