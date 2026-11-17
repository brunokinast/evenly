import { getApp, initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { FirebaseFirestore } from "@capacitor-firebase/firestore";
import { mark } from "@/lib/perf";

// Only the real build (`vite build`, mode "production") talks to the real project. Every other mode (dev
// server, tests, `--mode emulator`, `--mode perf`) uses the local emulators under a demo project, so nothing
// can touch real data. Being a build-time constant, the emulator-only code is left out of the real build.
const env = import.meta.env;
const usesEmulators = import.meta.env.MODE !== "production";

/** Firebase runs in the native SDKs (the Android app), not as the JS SDK in the page. */
export const nativeFirebase = Capacitor.isNativePlatform();

initializeApp(
  usesEmulators
    ? { projectId: "demo-evenly", apiKey: "demo-key", authDomain: "demo-evenly.firebaseapp.com" }
    : {
        // Public client identifiers, not secrets (ADR 0003).
        apiKey: "AIzaSyCr3ngkIDuU81Q1AhmmzDA9e-JZVuJXz5o",
        authDomain: "evenly-app-6f5f2.firebaseapp.com",
        projectId: "evenly-app-6f5f2",
        appId: "1:842719625398:web:b228b3da4ed9e0db9d2617",
      },
);

// The plugins' useEmulator() methods are not React hooks.
/* eslint-disable react-hooks/rules-of-hooks */
async function connect() {
  // Single-tab cache (web): ~60–90 ms faster launches than multi-tab coordination (docs/performance.md). A
  // second tab of the site falls back to a memory cache and still works, just without offline data.
  const persistence = setup(FirebaseFirestore.enablePersistence({ synchronizeTabs: false }));
  await Promise.all([persistence, nativeFirebase ? null : webAuth()]);
  if (usesEmulators) {
    if (nativeFirebase) await setup(FirebaseAuthentication.useEmulator({ host: emulatorHost(), port: 9099 }));
    await setup(FirebaseFirestore.useEmulator({ host: emulatorHost(), port: 8080 }));
  }
}

/** Same host as the page, so a phone on the LAN reaches the emulators on this PC. The Android app's page is
 * always "localhost", so its build sets VITE_EMULATOR_HOST to this PC's LAN IP. */
const emulatorHost = () => env.VITE_EMULATOR_HOST || location.hostname;

/**
 * On the web the plugin uses getAuth(), which also sets up sign-in popups: it loads Google's api.js and an
 * iframe before the first auth state, every launch. Only anonymous sign-in is used here, so create Auth
 * first without that (same storage as getAuth(), so existing identities stay).
 */
async function webAuth() {
  const {
    initializeAuth,
    connectAuthEmulator,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
  } = await import("firebase/auth");
  const auth = initializeAuth(getApp(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
  // Before Auth restores a stored user, or its token check would go to the real service.
  if (usesEmulators) connectAuthEmulator(auth, `http://${emulatorHost()}:9099`, { disableWarnings: true });
}

/** On Android a WebView reload finds the native SDKs already set up; they refuse setup calls but keep the
 * first load's settings, so those rejections are harmless there. */
function setup(call: Promise<void>) {
  return nativeFirebase ? call.catch(() => {}) : call;
}

/* eslint-enable react-hooks/rules-of-hooks */
/** Resolves once Firebase is configured. Every function in src/data/ awaits it before its first call. */
export const firebaseReady: Promise<void> = connect().then(() => mark("firebase-ready"));
