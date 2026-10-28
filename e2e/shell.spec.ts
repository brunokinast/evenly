import { expect, test } from "@playwright/test";

test("app shell renders with design tokens", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Evenly" })).toBeVisible();
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(font).toContain("Hanken Grotesk");
  await page.screenshot({ path: info.outputPath("shell.png") });
});
