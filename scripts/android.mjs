// Android builds (Phase 5). The APK carries the web build from dist/.
//   node scripts/android.mjs dev [--js-sdk]  emulator-mode web build pointed at this PC's LAN IP, debug APK
//                                     ("Evenly Dev"), installed on a connected device/emulator if any
//   node scripts/android.mjs release  production web build, signed release APK in android/evenly.apk
//   node scripts/android.mjs key      creates the release key (android/release.jks + key.properties)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { adb, sdk } from "./android-sdk.mjs";
import { lanIp } from "./lan-ip.mjs";

const mode = process.argv[2];
const APK = "android/evenly.apk"; // gitignored (android/.gitignore: *.apk)
const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { shell: true, stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
// Gradle finds the SDK through android/local.properties (gitignored, per machine).
if (sdk && !existsSync("android/local.properties"))
  writeFileSync("android/local.properties", `sdk.dir=${sdk.replaceAll("\\", "/")}\n`);
const gradlew = `"${resolve("android", process.platform === "win32" ? "gradlew.bat" : "gradlew")}"`;

if (mode === "key") {
  if (existsSync("android/key.properties")) {
    console.log("android/key.properties already exists; not replacing the release key.");
    process.exit(1);
  }
  const pass = randomBytes(18).toString("base64url");
  run(
    `keytool -genkeypair -v -keystore android/release.jks -alias evenly -keyalg RSA -keysize 2048 ` +
      `-validity 36500 -storepass ${pass} -keypass ${pass} -dname "CN=Evenly, O=Kinast, C=BR"`,
  );
  writeFileSync(
    "android/key.properties",
    `storeFile=release.jks\nstorePassword=${pass}\nkeyAlias=evenly\nkeyPassword=${pass}\n`,
  );
  console.log("\nBack up android/release.jks and android/key.properties: every update needs this key.");
} else if (mode === "dev") {
  const host = process.env.EMULATOR_HOST ?? lanIp();
  if (!host) throw new Error("No LAN IP found; set EMULATOR_HOST.");
  // --js-sdk: the Firebase JS SDK in the WebView instead of the native SDKs (R5 comparison, docs/performance.md).
  const jsSdk = process.argv.includes("--js-sdk") ? { VITE_JS_SDK: "1" } : {};
  run("npx vite build --mode emulator", { env: { ...process.env, VITE_EMULATOR_HOST: host, ...jsSdk } });
  run("npx cap sync android", { env: { ...process.env, ...jsSdk } }); // capacitor.config.ts reads it too
  run(`${gradlew} assembleDebug`, { cwd: "android" });
  const apk = "android/app/build/outputs/apk/debug/app-debug.apk";
  const devices = spawnSync(`${adb} devices`, { shell: true, encoding: "utf8" }).stdout ?? "";
  // A frozen AVD makes `adb install` hang forever: give up after 2 minutes (restart the AVD then).
  if (/\tdevice\b/.test(devices)) run(`${adb} install -r ${apk}`, { timeout: 120_000 });
  console.log(`\nDebug APK (emulators at ${host}): ${apk}`);
} else if (mode === "release") {
  if (!existsSync("android/key.properties")) throw new Error("No release key: run `npm run android:key`.");
  run("npm run build");
  run("npx cap sync android");
  run(`${gradlew} assembleRelease`, { cwd: "android" });
  // Outside dist/, which every web build empties. Published as a GitHub Release asset (ADR 0005).
  copyFileSync("android/app/build/outputs/apk/release/app-release.apk", APK);
  console.log(`\nRelease APK: ${APK} (publish: a GitHub Release, see ADR 0005)`);
} else {
  console.log("Usage: node scripts/android.mjs dev | release | key");
  process.exit(1);
}
