import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { installMethod, type InstallMethod } from "@/domain/install";

// APP-3 / ID-10: the latest GitHub Release's APK (Firebase Hosting refuses .apk files on the free plan).
const APK_URL: string | null = "https://github.com/brunokinast/evenly/releases/latest/download/evenly.apk";
const SKIP_FIRST_KEY = "evenly.installFirstSkipped";

type PromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
let firstSkipped = readFlag(SKIP_FIRST_KEY);
let state = compute();
const listeners = new Set<() => void>();

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function saveFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Storage blocked: remembered for this visit only.
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
  return { method, firstSkipped, apkUrl: APK_URL };
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

/** ID-10 "Continue in Safari / the browser": straight to the name from now on, on this browser. */
export function skipInstallFirst() {
  firstSkipped = true;
  saveFlag(SKIP_FIRST_KEY);
  refresh();
}
