# Evenly docs

## What the app does: `specs/`

The source of truth for behavior. When behavior changes, the spec changes first, in the same commit as the code.

- [Product and principles](specs/README.md)
- [Design](specs/design.md): colors, type, layout and every component
- Features, each with acceptance criteria (like `TRIP-3`) that the tests are named after:
  [identity](specs/identity.md) · [trips](specs/trips.md) · [members](specs/members.md) · [invites and joining](specs/invites-and-joining.md) · [expenses](specs/expenses.md) · [balances and settlements](specs/balances-and-settlements.md) · [PDF export](specs/pdf-export.md) · [Gemini assistant](specs/assistant.md) · [app shell](specs/app-shell.md)

## How it's built

- [Architecture](architecture.md): folders, layers, how live data reaches the screens, Android, testing
- [Data model](data-model.md): the Firestore schema and the Security Rules design
- [Performance](performance.md): how speed is measured, the targets, and what keeps it fast

## Why: `decisions/`

Short records of each lasting decision (append-only: a changed decision gets a new record).

[0001 stack](decisions/0001-stack-and-context.md) · [0002 data layer](decisions/0002-data-layer.md) · [0003 Android app](decisions/0003-android-app.md) · [0005 APK on GitHub Releases](decisions/0005-apk-on-github-releases.md) · [0006 PDF text in any script](decisions/0006-pdf-text-any-script.md) · [0007 web launch copy](decisions/0007-web-launch-copy.md) · [0008 Gemini calendar bridge](decisions/0008-gemini-calendar-bridge.md)

## Runbooks

- [Relinking a person's trips](relink.md) to a new identity

`readme/` holds the images of the repo's README (made by `scripts/readme-images.mjs`).
