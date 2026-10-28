# 0001: Stack, constraints and working preferences

Status: accepted (2026-10-27). Decided with the user after research; don't re-litigate without a new reason.

## Constraints from the user
- Free to run; used occasionally (less than once a month), so nothing that pauses idle free projects.
- Small groups (~2–10 people) editing the same trip at once; changes must show live. Online only.
- Platforms: **native Android app (APK, required)** for future Gemini integration; **iPhone via PWA** (no App Store); web.
- Existing users and data must be kept; a one-time migration is fine.
- KISS: as few systems and dependencies as possible. Fast, low-friction UX is the top product priority.

## Decisions and why
| Choice | Why | Rejected |
|---|---|---|
| React + Vite + TypeScript | Best AI fluency; light web build (the old Flutter web build was slow to load) | Flutter (slow web load), Expo/React Native (heavier toolchain than needed once iPhone is a PWA) |
| Firebase: Hosting + Firestore + Auth (same project, Spark plan) | One system for all three, AI knows it well, no idle pausing, keeps existing users/data | Supabase (pauses free projects after 7 days idle), Convex (an extra system; idle policy unclear) |
| No Cloud Functions | They require the paid Blaze plan; Security Rules + transactions/batched writes enforce integrity instead | — |
| No Firebase Storage | Requires Blaze since Feb 2026; not needed by the specs | — |
| Tailwind + shadcn/ui | Consistent design tokens, accessible components, best AI fluency; add mobile patterns (bottom bar, sheets, safe areas) | Ionic (heavy, own look) |
| vite-plugin-pwa | Manifest + service worker for iPhone install | — |
| Capacitor (Android) | Wraps the same web app as a real Android project; native Kotlin can be added later | Separate native app (second codebase) |
| Native Firebase Auth on Android (`@capacitor-firebase/authentication`) | So future Kotlin code (Gemini AppFunctions) acts as the same signed-in user | — |
| Vitest + Firebase Emulator; Playwright for screenshots | Test logic and Security Rules locally; visual checks | — |

## Gemini (deferred, Phase 7)
- Mechanism: Android **AppFunctions** (Jetpack, Kotlin; Android 16+). As of the latest info (Oct 2026) Gemini calling third-party AppFunctions is still a private preview / Early Access Program (https://forms.gle/GN5ybjQFhzHRCguM7). The user's phone runs Android 17.
- Apps can't render their own UI cards inside Gemini; use a confirmation notification instead.
- To keep it cheap later: native auth from day one, a documented data model Kotlin can write to, validation in Security Rules, semantic/accessible HTML.

## Identity and migration facts
- Auth is anonymous only (decided). Users keep their identity only with the **same Firebase project + same Hosting origin** (web) and the **same Android applicationId `br.com.kinast.evenly` + same signing key** (Android update).
- Phase 5 needs the release keystore and its `key.properties`: **ask the user to copy them into this repo (gitignored)**; never read the old repo.
- Firebase project id: `evenly-app-6f5f2`. Get web/Android config via the Firebase CLI/console, not the old repo.
- Cutover must be one switch (migrate data + deploy web + publish APK); block writes from the old app (e.g. rules version gate).

## Working preferences
- The user doesn't write code and won't remember process; Claude must follow the workflow on its own.
- Each phase ends with the user's approval. Ask questions with the AskUserQuestion tool. Keep answers short.
- Setup only what's truly needed.
