# App shell: language, theme, install

## Acceptance criteria

- **APP-1** Languages: English and Portuguese (Brazil). The app follows the device language and falls back to English.
- **APP-2** Theme: light, dark or system (default). The choice is remembered on the device. In the Android app the launch screen follows it too, from the next launch (Android 12 and later).
- **APP-3** Install from the Profile sheet. The "Install app" row shows only when the app isn't already running installed, and depends on the device:
  - Android: "Get the Android app" downloads the APK, with a short note on allowing the install and on uninstalling the old Evenly app first (same app ID, another key; ADR 0004), and that the app starts fresh: trips in the browser won't be in it (ID-10). The APK is the latest GitHub Release's asset (ADR 0005).
  - iPhone/iPad Safari: opens the 3 steps (Share → Add to Home Screen → Add), with a note that the Home Screen app starts fresh: trips in Safari won't be in it (ID-10).
  - Other browsers that offer an install prompt: "Install app" triggers it. Where none of these apply, the row is hidden.
- **APP-7** Home never shows an install card or prompt. Installing is suggested once, before the name (ID-10), and stays available from Profile (APP-3). (Replaces the Home install card, removed 2026-10-28 by the user's choice.)
- **APP-8** Long text never breaks the layout. Names and trip names (up to 50 characters) stay on one line with "…" in rows, bars and pills, and wrap in sheet headers and details. No horizontal scrolling at any width down to 320px.
- **APP-4** First load on a phone is fast: Home is usable within ~2 s on a typical 4G connection, and cached opens are near-instant (budget to be confirmed in architecture).
- **APP-9** Changes take effect at once, like EXP-8: renaming a trip, adding or removing a member, leaving and changing your name show on screen right away and sync to the server in the background (Firestore's local-first writes). If the server refuses one (e.g. access was lost meanwhile), a notice says it couldn't be saved and the screen shows the server's version. Creating a trip, joining with a code, creating an invite code and deleting a trip wait for the server, since they only work once it has them (a new trip can't be opened before the server has it; deleting first reads all the trip's expenses there).
- **APP-10** On the website, reopening the app shows your trips from your last visit at once, while the login is still being confirmed with the server; live data replaces the list a moment later (the Android app confirms the login on the phone, so it needs no copy). The copy is only the trip list and your name, on this device; if the login turns out to be a different identity or none, it's discarded.
- **APP-6** Online only. When offline, a clear banner says so and actions that need the network are disabled.
- **APP-5** All interactive elements are accessible (labels, roles, focus), which also enables future assistant automation.

## Notes

- An installed app (iPhone home-screen app, Android APK) keeps its own storage, so it starts with a new identity (see identity notes). That's why installing is suggested before the name (ID-10), not later on Home.
