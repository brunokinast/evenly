import { devices, expect, test, type Page } from "@playwright/test";

// Each test gets a fresh browser context, so a fresh anonymous identity.

const nameField = (page: Page) => page.getByRole("textbox", { name: "Your name" });
const welcomeField = (page: Page) => page.getByRole("textbox", { name: "What's your name?" });
const welcomeHeading = (page: Page) => page.getByRole("heading", { name: "What's your name?" });

async function enterName(page: Page, name: string) {
  await page.goto("/");
  await expect(welcomeHeading(page)).toBeVisible();
  await welcomeField(page).fill(name);
  await welcomeField(page).press("Enter");
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
}

test("ID-1 ID-2 ID-8 first open asks for a name with the field focused; Enter submits", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(welcomeHeading(page)).toBeVisible();
  await expect(welcomeField(page)).toBeFocused();
  await page.screenshot({ path: info.outputPath("welcome.png") });
  await page.keyboard.type("Sam Rivera");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("home-empty.png") });
});

test("ID-3 rejects names under 2 or over 50 characters, trimmed", async ({ page }) => {
  await page.goto("/");
  await welcomeField(page).fill("  A  ");
  await welcomeField(page).press("Enter");
  await expect(page.getByRole("alert")).toHaveText("Use at least 2 characters.");
  await welcomeField(page).fill("x".repeat(51));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toHaveText("Use at most 50 characters.");
  await expect(welcomeHeading(page)).toBeVisible();
});

test("ID-4 a returning user goes straight to Home with the same identity", async ({ page }) => {
  await enterName(page, "Ana Souza");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await page.getByRole("button", { name: "Profile" }).click();
  await expect(nameField(page)).toHaveValue("Ana Souza");
});

test("ID-6 a failed identity setup shows Unable to connect, and Try again recovers", async ({
  page,
}, info) => {
  await page.route("**/identitytoolkit.googleapis.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unable to connect" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("unable-to-connect.png") });
  await page.unroute("**/identitytoolkit.googleapis.com/**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(welcomeHeading(page)).toBeVisible();
});

test("ID-9 Done saves the name; closing the sheet otherwise keeps the old one", async ({ page }, info) => {
  await enterName(page, "Ana");
  const profile = page.getByRole("button", { name: "Profile" });

  await profile.click();
  await expect(nameField(page)).toBeFocused();
  await nameField(page).fill("Bia");
  await page.keyboard.press("Escape");
  await profile.click();
  await expect(nameField(page)).toHaveValue("Ana");

  await nameField(page).fill("X");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("alert")).toHaveText("Use at least 2 characters.");

  await nameField(page).fill("Beatriz Lima");
  await page.screenshot({ path: info.outputPath("profile.png") });
  await nameField(page).press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(profile).toContainText("BL");
  await page.reload();
  await profile.click();
  await expect(nameField(page)).toHaveValue("Beatriz Lima");
});

test("ID-9 Android back closes the sheet without leaving Home", async ({ page }) => {
  await enterName(page, "Ana");
  await page.getByRole("button", { name: "Profile" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();

  // Reloading with a sheet open must not leave a stale entry that swallows the next back.
  await page.getByRole("button", { name: "Profile" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Profile" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("APP-2 theme choice applies instantly and is remembered", async ({ page }, info) => {
  await enterName(page, "Ana");
  await page.getByRole("button", { name: "Profile" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: info.outputPath("profile-dark.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.waitForFunction(() => !history.state?.evenlySheet);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: info.outputPath("home-dark.png") });
});

test.describe("on an iPhone", () => {
  const { userAgent, viewport } = devices["iPhone 15"];
  test.use({ userAgent, viewport });

  test("APP-7 APP-3 install card shows the Add to Home Screen steps; Not now hides it for good", async ({
    page,
  }, info) => {
    await enterName(page, "Ana");
    const card = page.getByRole("region", { name: "Get Evenly on your home screen" });
    await expect(card).toBeVisible();
    await page.screenshot({ path: info.outputPath("home-install-card.png") });
    await card.getByRole("button", { name: "Add to Home Screen" }).click();
    await expect(page.getByRole("dialog", { name: "Add to Home Screen" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("ios-steps.png") });
    await page.getByRole("button", { name: "Done" }).click();

    await page.getByRole("button", { name: "Profile" }).click();
    await expect(page.getByRole("button", { name: "Install app" })).toBeVisible();
    await page.keyboard.press("Escape");

    await card.getByRole("button", { name: "Not now" }).click();
    await expect(card).toBeHidden();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    await expect(card).toBeHidden();
  });
});

test("APP-3 no install offered on Android while there's no APK and no browser prompt", async ({ page }) => {
  await enterName(page, "Ana");
  await expect(page.getByRole("region", { name: "Get Evenly on your home screen" })).toBeHidden();
  await page.getByRole("button", { name: "Profile" }).click();
  await expect(page.getByRole("button", { name: "Install app" })).toBeHidden();
});

test("APP-8 a 50-character name keeps the layout at 320px wide", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await enterName(page, "Maximiliana Bartholomew-Fitzgerald de Albuquerque");
  await page.getByRole("button", { name: "Profile" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
  await page.screenshot({ path: info.outputPath("profile-320.png") });
});

test("testing-only Reset account goes back to Welcome with a new identity", async ({ page }) => {
  await enterName(page, "Ana");
  await page.getByRole("button", { name: "Profile" }).click();
  await page.getByRole("button", { name: "Reset account (testing)" }).click();
  await expect(welcomeHeading(page)).toBeVisible();
  await expect(welcomeField(page)).toHaveValue("");
  await page.reload();
  await expect(welcomeHeading(page)).toBeVisible();
});
