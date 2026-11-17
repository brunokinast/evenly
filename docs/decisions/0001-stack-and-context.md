# 0001: Stack, constraints and working preferences

Status: accepted (2026-10-27). Decided with the user after research; don't re-litigate without a new reason.

## Constraints from the user

- Free to run; used occasionally (less than once a month), so nothing that pauses idle free projects.
- Small groups (~2–10 people) editing the same trip at once; changes must show live. Needs a connection to change data (the last data shows offline).
- Platforms: **native Android app (APK, required)** for the Gemini integration (ADR 0008); **iPhone via PWA** (no App Store); web.
- KISS: as few systems and dependencies as possible. Fast, low-friction UX is the top product priority.

## Decisions and why

| Choice                                                                 | Why                                                                                                                    | Rejected                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| React + Vite + TypeScript                                              | Best AI fluency; light, fast-loading web build                                                                         | Flutter (slow web load), Expo/React Native (heavier toolchain than needed once iPhone is a PWA)  |
| Firebase: Hosting + Firestore + Auth (same project, Spark plan)        | One system for all three, AI knows it well, no idle pausing                                                            | Supabase (pauses free projects after 7 days idle), Convex (an extra system; idle policy unclear) |
| No Cloud Functions                                                     | They require the paid Blaze plan; Security Rules + single or batched writes enforce integrity instead                  | —                                                                                                |
| No Firebase Storage                                                    | Requires Blaze since Feb 2026; not needed by the specs                                                                 | —                                                                                                |
| Tailwind + own small components                                        | Consistent design tokens, best AI fluency; mobile patterns (bottom bar, sheets, safe areas) built in `src/components/` | Ionic (heavy, own look), shadcn/ui (more than needed)                                            |
| vite-plugin-pwa                                                        | Manifest + service worker for iPhone install                                                                           | —                                                                                                |
| Capacitor (Android)                                                    | Wraps the same web app as a real Android project; native Kotlin can be added later                                     | Separate native app (second codebase)                                                            |
| Native Firebase Auth on Android (`@capacitor-firebase/authentication`) | So native Android code can act as the same signed-in user                                                              | —                                                                                                |
| Vitest + Firebase Emulator; Playwright for screenshots                 | Test logic and Security Rules locally; visual checks                                                                   | —                                                                                                |

## Identity facts

- Auth is anonymous only (decided). Users keep their identity only with the **same Firebase project + same Hosting origin** (web) and the **same Android applicationId `br.com.kinast.evenly` + same signing key** (Android update). Moving a person's trips to a new identity: `docs/relink.md`.
- Firebase project id: `evenly-app-6f5f2`. Get web/Android config via the Firebase CLI/console.
- Gemini: ADR 0008.

Working preferences live in `.claude/CLAUDE.md`.
