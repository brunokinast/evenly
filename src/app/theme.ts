import { useSyncExternalStore } from "react";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

// APP-2: light, dark or system (default), remembered on this device.
export type ThemeChoice = "system" | "light" | "dark";

const KEY = "evenly.theme";
const dark = matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

let choice = read();

function apply() {
  const isDark = choice === "dark" || (choice === "system" && dark.matches);
  document.documentElement.classList.toggle("dark", isDark);
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
  // Android draws the app under transparent system bars; their icons follow our theme, not the phone's.
  if (Capacitor.isNativePlatform())
    void SystemBars.setStyle({ style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
}
apply();
dark.addEventListener("change", apply);

export function setTheme(next: ThemeChoice) {
  choice = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
  apply();
  listeners.forEach((l) => l());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => choice,
  );
}
