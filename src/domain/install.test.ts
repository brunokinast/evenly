import { describe, expect, it } from "vitest";
import { installMethod, showInstallFirst, type InstallContext } from "./install";

const ANDROID =
  "Mozilla/5.0 (Linux; Android 17; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Safari";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36";

const ctx = (over: Partial<InstallContext>): InstallContext => ({
  userAgent: WINDOWS,
  maxTouchPoints: 0,
  installed: false,
  canPrompt: false,
  apkUrl: null,
  ...over,
});

describe("installMethod", () => {
  it("APP-3 offers nothing when already running installed", () => {
    expect(installMethod(ctx({ userAgent: ANDROID, installed: true, apkUrl: "/evenly.apk" }))).toBeNull();
    expect(installMethod(ctx({ userAgent: IPHONE, installed: true }))).toBeNull();
  });

  it("APP-3 Android downloads the APK when it exists", () => {
    expect(installMethod(ctx({ userAgent: ANDROID, apkUrl: "/evenly.apk", canPrompt: true }))).toBe("apk");
  });

  it("APP-3 Android falls back to the web-app install until the APK exists", () => {
    expect(installMethod(ctx({ userAgent: ANDROID, canPrompt: true }))).toBe("prompt");
    expect(installMethod(ctx({ userAgent: ANDROID }))).toBeNull();
  });

  it("APP-3 iPhone and iPad get the Add to Home Screen steps", () => {
    expect(installMethod(ctx({ userAgent: IPHONE }))).toBe("ios");
    expect(installMethod(ctx({ userAgent: MAC, maxTouchPoints: 5 }))).toBe("ios");
  });

  it("APP-3 only Safari gets the steps; other iOS and in-app browsers can't add to the home screen", () => {
    const chromeIOS = IPHONE.replace("Version/26.0", "CriOS/140.0");
    const instagram = IPHONE.replace("Safari", "Mobile/15E148 Instagram 400.0");
    expect(installMethod(ctx({ userAgent: chromeIOS }))).toBeNull();
    expect(installMethod(ctx({ userAgent: instagram }))).toBeNull();
  });

  it("APP-3 other browsers use their install prompt, else nothing", () => {
    expect(installMethod(ctx({ canPrompt: true }))).toBe("prompt");
    expect(installMethod(ctx({ userAgent: MAC }))).toBeNull();
  });
});

describe("showInstallFirst", () => {
  it("ID-10 suggests installing first only where the app is a separate identity, until skipped", () => {
    expect(showInstallFirst("apk", false)).toBe(true);
    expect(showInstallFirst("ios", false)).toBe(true);
    expect(showInstallFirst("prompt", false)).toBe(false);
    expect(showInstallFirst(null, false)).toBe(false);
    expect(showInstallFirst("apk", true)).toBe(false);
  });
});
