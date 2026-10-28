# 0003: Android app identity and builds

Status: accepted (2026-10-28, Phase 5).

## Decisions

1. **Application ID `br.com.kinast.evenly`**, registered as a new Android app in Firebase project `evenly-app-6f5f2`. The old app was `com.example.evenly`; the new APK doesn't update it and installs next to it (user's choice).
2. **New release signing key**: `android/release.jks` + `android/key.properties`, made by `npm run android:key`, gitignored. Every future update must be signed with it, so the user keeps a backup.
3. **Two build types**:
   - debug = "Evenly Dev", ID `br.com.kinast.evenly.debug`, demo Firebase config (`android/app/src/debug/google-services.json`), talks to the emulators on this PC's LAN IP (`VITE_EMULATOR_HOST`, cleartext allowed in debug only). `npm run android:dev`.
   - release = the real project (`android/app/src/release/google-services.json`, `.env.production`). `npm run android:release` → `android/evenly.apk`; `firebase deploy` (predeploy: production build, then copy) serves it at `/evenly.apk` (APP-3).
4. **Back button**: the App plugin's `backButton` listener walks the web history (`history.back()`), so sheets, screens and the "Discard changes?" guard (`guardBack` in `Sheet.tsx`) work the same on Android and in browsers; on the first screen it moves the app to the background.
5. **Sharing** (invite text, PDF) goes through `src/app/share.ts`: Capacitor Share (+ Filesystem cache file for the PDF) on Android, the Web Share API or a download on the web.
6. **No service worker in the APK**: its code ships in the APK, and a cached worker could serve an old version after an update.

## Why

- (1) Keeping `com.example.evenly` only helps if the old signing key still exists, and a `com.example` ID can never go to Google Play. Old Android users start with a new identity; their old trips stay reachable only through the migration (Phase 6, optional).
- (3) The debug app can be tested on a phone or the Android emulator against local data, next to the real app, without touching production.

## Consequences

- Native SDKs survive a WebView reload while the page restarts: setup calls are allowed to fail there (`src/data/firebase.ts`) and the session reads the current user directly (`src/data/session.ts`).
- `.env.production` and both `google-services.json` files are committed: they are public client identifiers, not secrets.
