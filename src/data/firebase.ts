import { getApp, initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { FirebaseFirestore } from "@capacitor-firebase/firestore";
import { mark } from "@/lib/perf";

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
  const persistence = setup(FirebaseFirestore.enablePersistence({ synchronizeTabs: true }));
  if (!Capacitor.isNativePlatform()) await webAuth();
  await persistence;
  if (usesEmulators) {
    // Same host as the page, so a phone on the LAN reaches the emulators on this PC. The Android app's page
    // is always "localhost", so its build sets VITE_EMULATOR_HOST to this PC's LAN IP.
    const host = env.VITE_EMULATOR_HOST || location.hostname;
    await setup(FirebaseAuthentication.useEmulator({ host, port: 9099 }));
    await setup(FirebaseFirestore.useEmulator({ host, port: 8080 }));
  }
}

/**
 * On the web the plugin uses getAuth(), which also sets up sign-in popups: it loads Google's api.js and an
 * iframe before the first auth state, every launch. Only anonymous sign-in is used here, so create Auth
 * first without that (same storage as getAuth(), so existing identities stay).
 */
async function webAuth() {
  const { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence } =
    await import("firebase/auth");
  initializeAuth(getApp(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
}

/** On Android a WebView reload finds the native SDKs already set up; they refuse setup calls but keep the
 * first load's settings, so those rejections are harmless there. */
function setup(call: Promise<void>) {
  return Capacitor.isNativePlatform() ? call.catch(() => {}) : call;
}

/* eslint-enable react-hooks/rules-of-hooks */
/** Resolves once Firebase is configured. Every function in src/data/ awaits it before its first call. */
export const firebaseReady: Promise<void> = connect().then(() => mark("firebase-ready"));
