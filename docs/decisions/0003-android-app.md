# 0003: Android app identity and builds

Status: accepted (2026-10-28).

## Decisions

1. **Application ID `br.com.kinast.evenly`**, registered as an Android app in Firebase project `evenly-app-6f5f2`.
2. **New release signing key**: `android/release.jks` + `android/key.properties`, made by `npm run android:key`, gitignored. Every future update must be signed with it, so the user keeps a backup. An older Google Play upload key for the same ID (the Play listing "Evenly - Divida gastos") is kept outside the repo: `C:\Users\bruno\upload-keystore.jks`, passwords in `upload-keystore.properties` next to it. Only needed if the app ever goes to Google Play.
3. **Two build types**:
   - debug = "Evenly Dev", ID `br.com.kinast.evenly.debug`, demo Firebase config (`android/app/src/debug/google-services.json`), talks to the emulators on this PC's LAN IP (`VITE_EMULATOR_HOST`, cleartext allowed in debug only). `npm run android:dev`.
   - release = the real project (`android/app/src/release/google-services.json`, `.env.production`). `npm run android:release` → `android/evenly.apk`; `firebase deploy` (predeploy: production build, then copy) serves it at `/evenly.apk` (APP-3).
4. **Back button**: the App plugin's `backButton` listener walks the web history (`history.back()`), so sheets, screens and the "Discard changes?" guard (`guardBack` in `Sheet.tsx`) work the same on Android and in browsers; on the first screen it moves the app to the background.
5. **Sharing** (invite text, PDF) goes through `src/app/share.ts`: Capacitor Share (+ Filesystem cache file for the PDF) on Android, the Web Share API or a download on the web.
6. **No service worker in the APK**: its code ships in the APK, and a cached worker could serve an old version after an update.

## Why

- (3) The debug app can be tested on a phone or the Android emulator against local data, next to the real app, without touching production.

## Consequences

- Native SDKs survive a WebView reload while the page restarts: setup calls are allowed to fail there (`src/data/firebase.ts`) and the session reads the current user directly (`src/data/session.ts`).
- `.env.production` and both `google-services.json` files are committed: they are public client identifiers, not secrets.
