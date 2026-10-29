# 0007: A launch copy of Home's trip list on the web

Status: accepted (2026-10-29). An exception to "no manual caches" (CLAUDE.md, ADR 0002), limited to what's below.

## Context

On every launch the Firebase Auth JS SDK re-checks the stored user with the server (`accounts:lookup`, plus a token refresh when the saved token is over an hour old) before it reports any user, and Firestore waits for that user before it reads even its offline cache. On a slow phone network that's ~0.3–0.6 s before Home can show anything (docs/performance.md). The native SDKs (Android app) report the stored user at once, so the app there has no such wait.

## Decision

- **Web only** (`!nativeFirebase`): after each live snapshot of Home's query, `src/data/launchCopy.ts` saves my uid, name and trip list in `localStorage`.
- On launch, before Auth answers, the session starts as that copy's identity and Home shows its trips (APP-10). Nothing else is copied: a trip, its expenses and every write still go through Firestore, which waits for Auth on its own.
- When Auth answers with the same uid, the session continues as usual; with another identity or none, the copy is discarded and the session follows Auth (Welcome for a new identity).

## Consequences

- Trips show on the website as soon as the code runs (~0.2 s on a slow phone in the lab instead of ~0.7 s).
- For that moment the list can be stale (e.g. a trip I was just removed from); opening one waits for live data as usual, and the live list replaces the copy.
- `localStorage` holds trip names and member names on the device, as Firestore's own offline cache already does.
