import { initializeApp } from "firebase/app";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { FirebaseFirestore } from "@capacitor-firebase/firestore";

// Production config comes from .env.production (VITE_FIREBASE_*). Without it (dev, tests) the app runs
// against the local emulators under a demo project, so nothing can touch real data.
const env = import.meta.env;
export const usesEmulators = !env.VITE_FIREBASE_API_KEY;

initializeApp(
  usesEmulators
    ? { projectId: "demo-evenly", apiKey: "demo-key", authDomain: "demo-evenly.firebaseapp.com" }
    : {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      },
);

// The plugins' useEmulator() methods are not React hooks.
/* eslint-disable react-hooks/rules-of-hooks */
async function connect() {
  await FirebaseFirestore.enablePersistence({ synchronizeTabs: true });
  if (usesEmulators) {
    // Same host as the page, so a phone on the LAN reaches the emulators on this PC.
    const host = location.hostname;
    await FirebaseAuthentication.useEmulator({ host, port: 9099 });
    await FirebaseFirestore.useEmulator({ host, port: 8080 });
  }
}

/* eslint-enable react-hooks/rules-of-hooks */
/** Resolves once Firebase is configured. Every function in src/data/ awaits it before its first call. */
export const firebaseReady: Promise<void> = connect();
