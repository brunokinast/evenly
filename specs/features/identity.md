# Identity

## Description

Users don't create accounts. On first open, the app silently gives the device an identity and asks only for a display name. The name is visible to people who share a trip with the user.

## Flows

1. **First open**: the app sets up an identity, then shows a welcome screen asking "What's your name?". After the user enters a name, they land on Home. In Safari on an iPhone or iPad, or in a browser on Android, a step before the name suggests installing the app first (ID-10).
2. **Returning**: the app opens straight to Home with the same identity and trips.
3. **Change name**: from the Profile sheet (avatar button on Home), the user can change their display name.

## Acceptance criteria

- **ID-1** Given a first-time user, when the app opens, then an identity is created without asking for any credentials.
- **ID-2** Given a user without a name, when they open the app, then they see the welcome screen and can't reach Home until they enter a name.
- **ID-3** The name is trimmed and must be 2 to 50 characters; otherwise an inline message explains why.
- **ID-4** Given a returning user on the same device/browser, when they open the app, then they see Home directly with their trips.
- **ID-5** Given a user changes their name, then every trip member sees the new name live.
- **ID-6** If identity setup fails (e.g. offline), the user sees a clear "Unable to connect" message with a Try again button. On a first open the name screen shows while the identity is being created; if that fails, the message appears when the user continues.
- **ID-7** A user's name is visible only to people who share at least one trip with them.
- **ID-8** The welcome screen opens with the name field focused and the keyboard up; Enter submits.
- **ID-9** The Profile sheet opens without the keyboard (it is opened for the name or the theme alike). Done or Enter saves the name. Closing the sheet any other way (backdrop, swipe down, back) keeps the old name. An invalid name shows the ID-3 message and the sheet stays open.
- **ID-10** Given a user without a name, in a browser where installing the app would start a new identity, when the app opens, then before the name it suggests installing first, saying why (the installed app keeps its own data, apart from the browser, so trips started in the browser don't move to it):
  - iPhone/iPad Safari: "Add Evenly to your Home Screen first", the APP-3 three steps, and "Continue in Safari".
  - Android browser: "Get the Android app first", the APP-3 Download button and its note, and "Continue in the browser".
  - "Continue in …" goes to the name and is remembered on this browser. Every other case (computers, the installed app itself) goes straight to the name.

## Notes

- Identity is tied to the device/browser. There is no sign-in; losing the device's app data means losing access to your trips. This is an accepted trade-off for zero friction.
- Safari and its Home Screen web app (iPhone/iPad), and an Android browser and the Android app, keep separate data, so each is its own identity (ID-10). An old trip can be moved to a new identity only by hand (`scripts/relink.ts`).
