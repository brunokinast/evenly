# 0004: The old Android app has the same application ID

Status: accepted (2026-10-28, Phase 6). Corrects a fact in ADR 0003 decision 1; its decisions stand.

## Context

ADR 0003 said the old Android app was `com.example.evenly`. That was wrong (probably only its Firebase registration): the installed old app's package is **`br.com.kinast.evenly`**, the same ID as the new app, signed with a different key.

## Decision

Keep the new ID and the new release key (`android/release.jks`). Old users must **uninstall the old app first**: Android refuses to install an APK over an app with the same ID and another signing key. The install note and the message to the two old users say so.

## Consequences

- The new APK never sits next to the old one; there is no side-by-side period on the same phone.
- Old users' data reaches them only through the migration and `scripts/relink.ts` (Phase 6), not through the device.
