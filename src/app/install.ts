import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { installMethod, type InstallMethod } from "@/domain/install";

// APP-3 / APP-7: the release APK's download URL. Not on Firebase Hosting: the free plan refuses .apk files.
const APK_URL: string | null = null;
const DISMISS_KEY = "evenly.installCardDismissed";

type PromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
let dismissed = readDismissed();
let state = compute();
const listeners = new Set<() => void>();

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function installed() {
  return (
    Capacitor.isNativePlatform() ||
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function compute() {
  const method: InstallMethod = installMethod({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    installed: installed(),
    canPrompt: deferred !== null,
    apkUrl: APK_URL,
  });
  return { method, dismissed, apkUrl: APK_URL };
}

function refresh() {
  state = compute();
  listeners.forEach((l) => l());
}

addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as PromptEvent;
  refresh();
});
addEventListener("appinstalled", () => {
  deferred = null;
  refresh();
});

export function useInstall() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** Shows the browser's own install prompt (method "prompt"). */
export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  refresh();
}

/** APP-7 "Not now": hides the Home card on this device for good. */
export function dismissInstallCard() {
  dismissed = true;
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Storage blocked: hidden for this visit only.
  }
  refresh();
}
