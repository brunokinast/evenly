/** How this device can install the app (APP-3); null = no install offered. */
export type InstallMethod = "apk" | "ios" | "prompt" | null;

export type InstallContext = {
  userAgent: string;
  /** Touch points, to tell iPadOS (which reports a Mac user agent) from a Mac. */
  maxTouchPoints: number;
  /** Already running installed: home-screen app, PWA window or the Android app. */
  installed: boolean;
  /** The browser offered an install prompt (beforeinstallprompt). */
  canPrompt: boolean;
  /** Where the APK is served, once it exists (Phase 5). */
  apkUrl: string | null;
};

/** iPhone/iPad Safari: the browser whose Share menu has Add to Home Screen (APP-3). */
export function isIOSSafari({
  userAgent,
  maxTouchPoints,
}: Pick<InstallContext, "userAgent" | "maxTouchPoints">) {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  // Other iOS browsers and in-app browsers (Instagram, Facebook, LINE, Google app…) identify themselves.
  const other = /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|GSA\//.test(userAgent);
  return ios && !other && /Safari/.test(userAgent);
}

export function installMethod(ctx: InstallContext): InstallMethod {
  if (ctx.installed) return null;
  if (/Android/.test(ctx.userAgent) && ctx.apkUrl) return "apk";
  if (isIOSSafari(ctx)) return "ios";
  return ctx.canPrompt ? "prompt" : null;
}

/** ID-10: before the name, suggest installing where the installed app would be a separate identity. */
export function showInstallFirst(method: InstallMethod, skipped: boolean): method is "apk" | "ios" {
  return (method === "apk" || method === "ios") && !skipped;
}
