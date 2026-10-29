import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.kinast.evenly",
  appName: "Evenly",
  webDir: "dist",
  // R5 comparison build (scripts/android.mjs dev --js-sdk): the JS SDK reaches the emulators over plain HTTP from
  // the https://localhost page. Never in other builds.
  android: { allowMixedContent: process.env.VITE_JS_SDK === "1" },
  plugins: {
    FirebaseAuthentication: { skipNativeAuth: false, providers: [] },
  },
};

export default config;
