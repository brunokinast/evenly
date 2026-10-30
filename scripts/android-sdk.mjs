// The Android SDK and adb on this PC (scripts/android.mjs, scripts/perf-android.mjs).
import { execSync } from "node:child_process";

export const sdk =
  process.env.ANDROID_HOME ?? (process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Android/Sdk`);
export const adb = sdk ? `"${sdk}/platform-tools/adb"` : "adb";

/** Runs `adb <args>` and returns its trimmed output. */
export const adbCommand = (args) => execSync(`${adb} ${args}`, { encoding: "utf8" }).trim();
