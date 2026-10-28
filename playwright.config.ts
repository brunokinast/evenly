import { defineConfig, devices } from "@playwright/test";

// Phone-viewport screenshot checks against the dev server. Screenshots land in test-results/ for review
// against specs/design.md. Slices that need data start the emulators with `npm run emulators` first.
export default defineConfig({
  testDir: "e2e",
  use: { ...devices["Pixel 7"], baseURL: "http://localhost:5173" },
  webServer: { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
});
