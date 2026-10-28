// Source dictionary. pt-BR.ts must have the same keys (checked by its type).
export const en = {
  "app.name": "Evenly",
  "common.done": "Done",
  "common.notNow": "Not now",
  "common.tryAgain": "Try again",
  "common.continue": "Continue",

  "connect.title": "Unable to connect",
  "connect.body": "Check your internet connection and try again.",

  "welcome.title": "What's your name?",
  "welcome.body": "Friends see it in the trips you share. No account needed.",
  "name.label": "Your name",
  "name.tooShort": "Use at least 2 characters.",
  "name.tooLong": "Use at most 50 characters.",
  "name.saveFailed": "Couldn't save your name. Try again.",

  "home.title": "Your trips",
  "home.profile": "Profile",
  "home.empty": "No trips yet. Create one and invite your friends, or join a trip with a 6-digit code.",
  "home.joinTrip": "Join trip",
  "home.newTrip": "New trip",

  "profile.title": "Profile",
  "profile.theme": "Theme",
  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",

  "install.row": "Install app",
  "install.cardTitle": "Get Evenly on your home screen",
  "install.cardBody": "Opens instantly, like any other app.",
  "install.action.apk": "Get the Android app",
  "install.action.ios": "Add to Home Screen",
  "install.action.prompt": "Install app",
  "install.ios.title": "Add to Home Screen",
  "install.ios.step1": "Tap Share in the browser's toolbar.",
  "install.ios.step2": "Scroll down and tap Add to Home Screen.",
  "install.ios.step3": "Tap Add. Evenly is now on your home screen.",
  "install.apk.title": "Get the Android app",
  "install.apk.body":
    "Open the downloaded file to install it. If Android asks, allow your browser to install apps.",
  "install.apk.download": "Download",
} as const;

export type MessageKey = keyof typeof en;
