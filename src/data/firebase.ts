import { getApp, initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication as NativeAuthentication } from "@capacitor-firebase/authentication";
import { FirebaseFirestore as NativeFirestore } from "@capacitor-firebase/firestore";
import { mark } from "@/lib/perf";

// Production config comes from .env.production (VITE_FIREBASE_*). Without it (dev, tests) the app runs
// against the local emulators under a demo project, so nothing can touch real data.
const env = import.meta.env;
export const usesEmulators = !env.VITE_FIREBASE_API_KEY;

/** R5 comparison builds only (`node scripts/android.mjs dev --js-sdk`, docs/performance.md): the Android app
 * runs the plugins' web versions, i.e. the Firebase JS SDK inside the WebView, instead of the native SDKs. */
const jsSdkOnAndroid = env.VITE_JS_SDK === "1";
/** Firebase runs in the native SDKs (the Android app), not as the JS SDK in the page. */
export const nativeFirebase = Capacitor.isNativePlatform() && !jsSdkOnAndroid;

/** The plugins every call in src/data/ goes through (their web versions in R5 comparison builds). Use them
 * only after `firebaseReady`. */
export let FirebaseFirestore = NativeFirestore;
export let FirebaseAuthentication = NativeAuthentication;

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
  if (jsSdkOnAndroid) {
    const { FirebaseFirestoreWeb } = await import("@capacitor-firebase/firestore/dist/esm/web.js");
    FirebaseFirestore = new FirebaseFirestoreWeb() as unknown as typeof NativeFirestore;
  }
  // Single-tab cache (web): ~60–90 ms faster launches than multi-tab coordination (docs/performance.md, R2). A
  // second tab of the site falls back to a memory cache and still works, just without offline data.
  const persistence = setup(FirebaseFirestore.enablePersistence({ synchronizeTabs: false }));
  await Promise.all([persistence, nativeFirebase ? null : webAuth()]);
  if (jsSdkOnAndroid) {
    // After webAuth(): the web plugin's constructor calls getAuth(), which must find that Auth.
    const { FirebaseAuthenticationWeb } = await import("@capacitor-firebase/authentication/dist/esm/web.js");
    FirebaseAuthentication = new FirebaseAuthenticationWeb() as unknown as typeof NativeAuthentication;
  }
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
