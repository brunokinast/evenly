import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // first: theme.ts reads its tokens
import "@/app/theme";
import "@/app/viewport";
import "@/app/install";
import { App } from "@/app/App";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";

if (Capacitor.isNativePlatform()) {
  // Android Back walks the web history (sheets and screens, src/app/nav.ts); on the first screen it leaves
  // the app the way other apps do (to the background).
  void NativeApp.addListener("backButton", ({ canGoBack }) =>
    canGoBack ? history.back() : void NativeApp.minimizeApp(),
  );
} else {
  // The Android app ships its code in the APK; a service worker there could keep serving an old version.
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
