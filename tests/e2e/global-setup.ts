import { chromium } from "@playwright/test";

// A cold dev server pre-bundles its dependencies on the first page load (the PDF libraries included), which
// can take longer than one test's wait on CI. Load the app once before the tests start.
export default async function warmUp() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/", { timeout: 120_000 });
  await page.locator("h1").first().waitFor({ timeout: 120_000 });
  await browser.close();
}
