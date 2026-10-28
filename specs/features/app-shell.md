# App shell: language, theme, install

## Acceptance criteria

- **APP-1** Languages: English and Portuguese (Brazil). The app follows the device language and falls back to English.
- **APP-2** Theme: light, dark or system (default). The choice is remembered on the device. In the Android app the launch screen follows it too, from the next launch (Android 12 and later).
- **APP-3** Install from the Profile sheet. The "Install app" row shows only when the app isn't already running installed, and depends on the device:
  - Android: "Get the Android app" downloads the APK, with a short note on allowing the install and on uninstalling the old Evenly app first (same app ID, another key; ADR 0004). The APK is the latest GitHub Release's asset (ADR 0005).
  - iPhone/iPad Safari: opens the 3 steps (Share → Add to Home Screen → Add).
  - Other browsers that offer an install prompt: "Install app" triggers it. Where none of these apply, the row is hidden.
- **APP-7** Given Home has no trips and the app isn't running installed, an install card sits under the empty-state message: "Get Evenly on your home screen", "Opens instantly, like any other app.", the APP-3 action for this device, and "Not now", which hides the card on this device for good. The card is never shown once the user has a trip.
- **APP-8** Long text never breaks the layout. Names and trip names (up to 50 characters) stay on one line with "…" in rows, bars and pills, and wrap in sheet headers and details. No horizontal scrolling at any width down to 320px.
- **APP-4** First load on a phone is fast: Home is usable within ~2 s on a typical 4G connection, and cached opens are near-instant (budget to be confirmed in architecture).
- **APP-6** Online only. When offline, a clear banner says so and actions that need the network are disabled.
- **APP-5** All interactive elements are accessible (labels, roles, focus), which also enables future assistant automation.

## Notes

- An installed app (iPhone home-screen app, Android APK) keeps its own storage, so it starts with a new identity (see identity notes). That's why APP-7 only recommends installing before the user has any trips.
