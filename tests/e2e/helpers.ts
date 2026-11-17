import { devices, expect, type Browser, type Page } from "@playwright/test";

/** Browser state where "Continue in the browser" (ID-10) was already chosen, so the app opens at the name. */
export const skippedInstallFirst = {
  cookies: [],
  origins: [
    {
      origin: "http://localhost:5173",
      localStorage: [{ name: "evenly.installFirstSkipped", value: "1" }],
    },
  ],
};

/** A fresh user (own browser context = own anonymous identity) who has entered their name. */
export async function newUser(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL: "http://localhost:5173",
    locale: "en-US",
    reducedMotion: "reduce",
    storageState: skippedInstallFirst,
  });
  const page = await context.newPage();
  await enterName(page, name);
  return page;
}

/** Opens the app at the Welcome name (ID-1), enters `name` and waits for Home. */
export async function enterName(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What's your name?" }).fill(name);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
}

/** TRIP-10: name, Enter (closes the keyboard), then Create trip (default icon and currency, or the ones given). */
export async function createTrip(page: Page, name: string, currency?: string) {
  await page.getByRole("button", { name: "New trip" }).click();
  await page.getByRole("textbox", { name: "Trip name" }).fill(name);
  if (currency) await page.getByRole("button", { name: currency, exact: true }).click();
  await page.getByRole("textbox", { name: "Trip name" }).press("Enter");
  await expect(page.getByRole("textbox", { name: "Trip name" })).not.toBeFocused();
  await page.getByRole("button", { name: "Create trip" }).click();
  // Creating stays on Home (trips.md flow 3); open the trip on Members, where the tests continue.
  await expect(page.getByText(`${name} created`)).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: new RegExp(name) })
    .first()
    .click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await tab(page, "Members");
}

export const tab = (page: Page, name: "Expenses" | "Balances" | "Members") =>
  page.getByRole("tab", { name }).click();

/** Opens Invite and returns the 6-digit code shown. */
export async function inviteCode(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Invite", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Invite code" });
  // Creating the code waits for the server: see the note in addExpense.
  await expect(dialog.getByText(/^\d{3} \d{3}$/)).toBeVisible({ timeout: 15_000 });
  const code = (await dialog.getByText(/^\d{3} \d{3}$/).textContent())!.replace(/\D/g, "");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  return code;
}

/** Joins with a code from Home; `claim` picks a guest first. */
export async function join(page: Page, code: string, tripName: string, claim?: string) {
  await page.getByRole("button", { name: "Join trip" }).click();
  await page.getByRole("textbox", { name: "Invite code" }).fill(code);
  const dialog = page.getByRole("dialog", { name: "Join trip" });
  await expect(dialog.getByText(tripName)).toBeVisible();
  if (claim) await dialog.getByRole("button", { name: claim }).click();
  await dialog.getByRole("button", { name: claim ? `Join as ${claim}` : "Join trip" }).click();
  await expect(page.getByRole("heading", { name: tripName })).toBeVisible();
}

/** EXP-9, EXP-10: amount, Enter, description, Enter (closes the keyboard), Save. */
export async function addExpense(page: Page, digits: string, description: string) {
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByRole("heading", { name: "New expense" })).toBeVisible();
  await page.keyboard.type(digits);
  await page.keyboard.press("Enter");
  await page.keyboard.type(description);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save" }).click();
  // Save closes at once (EXP-8); the margin is for a long-running emulator, which slows down (docs/performance.md).
  await expect(page.getByRole("tab", { name: "Expenses" })).toBeVisible({ timeout: 15_000 });
}

/** In the open Date and time sheet's calendar (EXP-17), picks yesterday, going back a month if needed. */
export async function pickYesterday(page: Page) {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (yesterday.getMonth() !== now.getMonth())
    await page.getByRole("button", { name: "Previous month" }).click();
  const name = new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(yesterday);
  await page.getByRole("button", { name, exact: true }).click();
}
