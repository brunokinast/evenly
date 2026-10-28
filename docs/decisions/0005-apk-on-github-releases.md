# 0005: The APK ships as a GitHub Release

Status: accepted (2026-10-28, Phase 6). Supersedes the "serves it at `/evenly.apk`" part of ADR 0003 decision 3.

## Context

Firebase Hosting refuses executable files, `.apk` included, on the free Spark plan (`firebase deploy` fails with "Executable files are forbidden on the Spark billing plan"). The project stays on Spark (ADR 0001).

## Decision

The release APK is an asset named `evenly.apk` on a GitHub Release of the public repo `brunokinast/evenly`. The app's install button (APP-3) links to `https://github.com/brunokinast/evenly/releases/latest/download/evenly.apk`, which always serves the newest release, so the web app never changes for a new APK. `firebase deploy` ships only the web app.

## Consequences

- A new APK = raise `versionCode`/`versionName`, `npm run android:release`, `gh release create vX.Y android/evenly.apk`. No web deploy needed.
- The repo must stay public for the link to work without a GitHub login.
