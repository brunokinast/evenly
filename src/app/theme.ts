import { useSyncExternalStore } from "react";
import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { changes } from "@/lib/changes";
import { readStored, writeStored } from "@/lib/storage";

// APP-2: light, dark or system (default), remembered on this device.
export type ThemeChoice = "system" | "light" | "dark";

const KEY = "evenly.theme";
// Native side in android/…/AppThemePlugin.java: the launch screen follows the choice from the next launch.
const AppTheme = registerPlugin<{ set(o: { theme: ThemeChoice }): Promise<void> }>("AppTheme");
const dark = matchMedia("(prefers-color-scheme: dark)");
const choiceChanges = changes();

function read(): ThemeChoice {
  const v = readStored(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

let choice = read();

function apply() {
  const isDark = choice === "dark" || (choice === "system" && dark.matches);
  document.documentElement.classList.toggle("dark", isDark);
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
  // Android draws the app under transparent system bars; their icons follow our theme, not the phone's.
  if (Capacitor.isNativePlatform()) {
    void SystemBars.setStyle({ style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
    void AppTheme.set({ theme: choice });
  }
}
apply();
dark.addEventListener("change", apply);

export function setTheme(next: ThemeChoice) {
  choice = next;
  writeStored(KEY, next);
  apply();
  choiceChanges.notify();
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(choiceChanges.subscribe, () => choice);
}
