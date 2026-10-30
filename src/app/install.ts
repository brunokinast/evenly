import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { installMethod, type InstallMethod } from "@/domain/install";
import { changes } from "@/lib/changes";
import { readStored, writeStored } from "@/lib/storage";

// APP-3 / ID-10: the latest GitHub Release's APK (Firebase Hosting refuses .apk files on the free plan).
const APK_URL: string | null = "https://github.com/brunokinast/evenly/releases/latest/download/evenly.apk";
const SKIP_FIRST_KEY = "evenly.installFirstSkipped";

type PromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
let firstSkipped = readStored(SKIP_FIRST_KEY) === "1";
let state = compute();
const stateChanges = changes();

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
  stateChanges.notify();
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
  return useSyncExternalStore(stateChanges.subscribe, () => state);
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
  writeStored(SKIP_FIRST_KEY, "1");
  refresh();
}
