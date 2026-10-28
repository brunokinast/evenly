import { defineConfig, devices } from "@playwright/test";

// Phone-viewport checks against the dev server and the local emulators (both started here if not running).
// Screenshots land in test-results/ for review against specs/design.md.
export default defineConfig({
  testDir: "e2e",
  use: { ...devices["Pixel 7"], baseURL: "http://localhost:5173", locale: "en-US", reducedMotion: "reduce" },
  webServer: [
    {
      command: "npm run emulators",
      url: "http://127.0.0.1:9099", // Auth starts after Firestore, so this means both are up.
      reuseExistingServer: true,
      timeout: 120_000,
    },
    { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
  ],
});
