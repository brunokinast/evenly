import { expect, test, type Page } from "@playwright/test";
import { createTrip, newUser } from "./helpers";

// The dev server's stand-in for the phone's "Evenly" calendar (src/app/devCalendar.ts).
async function geminiWrote(page: Page, titles: string[]) {
  const now = Date.now();
  await page.evaluate(
    (events) => localStorage.setItem("evenly.devCalendar", JSON.stringify({ access: "granted", events })),
    titles.map((title, i) => ({
      id: `ev${i}`,
      title,
      start: now - (titles.length - i) * 60_000,
      allDay: false,
    })),
  );
  await page.reload();
}
const calendarIds = (page: Page) =>
  page.evaluate(() =>
    (JSON.parse(localStorage.getItem("evenly.devCalendar")!) as { events: { id: string }[] }).events.map(
      (e) => e.id,
    ),
  );

async function lisbonWithBia(page: Page) {
  await createTrip(page, "Lisbon", "EUR");
  const guest = page.getByRole("textbox", { name: "Guest name" });
  await guest.fill("Bia");
  await guest.press("Enter");
  await expect(page.getByRole("button", { name: "Bia Guest" })).toBeVisible();
  await page.getByRole("button", { name: "Back to your trips" }).click();
}

test("AST-4..10 AST-12 review, correct and add what Gemini wrote", async ({ browser }, info) => {
  const ana = await newUser(browser, "Ana");
  await lisbonWithBia(ana);
  await geminiWrote(ana, ["60 | dinner | | |", "25 | taxi | bea | |", " | museum tickets | todos | |"]);

  // AST-6: the sheet lists every line; the dots mark a guess (bea → Bia) and a missing amount.
  const sheet = ana.getByRole("dialog", { name: /^From Gemini/ });
  await expect(sheet.getByRole("heading", { name: "From Gemini · 3" })).toBeVisible();
  await expect(sheet.getByLabel("Check this one")).toHaveCount(1);
  await expect(sheet.getByLabel("Needs a fix")).toHaveCount(1);
  await expect(sheet.getByRole("button", { name: "Add 2 expenses" })).toBeVisible();
  // AST-12: with Gemini set up, Home marks the default trip.
  await expect(ana.getByRole("img", { name: "Gemini adds here by default" })).toBeVisible();
  await ana.screenshot({ path: info.outputPath("gemini-review.png") });

  // AST-6, AST-7: open the taxi; the guessed split is highlighted until confirmed, even unchanged.
  await sheet.getByRole("button", { name: /taxi/ }).click();
  await ana.screenshot({ path: info.outputPath("gemini-line-open.png") });
  await sheet.getByRole("button", { name: "Split" }).click();
  await ana.getByRole("dialog", { name: "Split" }).getByRole("button", { name: "Done" }).click();
  await expect(sheet.getByLabel("Check this one")).toHaveCount(0);

  // The missing amount: typed in the amount chip's keypad (fills from the right, EXP-2).
  await sheet.getByRole("button", { name: /museum tickets/ }).click();
  await sheet.getByRole("button", { name: "Amount" }).click();
  const amount = ana.getByRole("dialog", { name: "Amount" });
  await amount.getByRole("textbox", { name: "Amount" }).pressSequentially("1500");
  await amount.getByRole("button", { name: "Done" }).click();
  await expect(sheet.getByLabel("Needs a fix")).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Add 3 expenses" })).toBeVisible();

  // AST-9: Remove drops the line and its event.
  await sheet.getByRole("button", { name: /dinner/ }).click();
  await sheet.getByRole("button", { name: "Remove" }).click();
  await expect(sheet.getByRole("button", { name: "Add 2 expenses" })).toBeVisible();

  // AST-10: one tap adds the rest; their events leave the calendar.
  await sheet.getByRole("button", { name: "Add 2 expenses" }).click();
  await expect(ana.getByText("2 expenses added")).toBeVisible();
  await expect(sheet).toBeHidden();
  expect(await calendarIds(ana)).toEqual([]);

  await ana
    .getByRole("main")
    .getByRole("button", { name: /Lisbon/ })
    .click();
  await expect(ana.getByText("taxi")).toBeVisible();
  await expect(ana.getByText("museum tickets")).toBeVisible();
  await expect(ana.getByText("dinner")).toHaveCount(0);
});

test("AST-10 Later keeps everything for next time; AST-8 another trip resets payer and split", async ({
  browser,
}) => {
  const ana = await newUser(browser, "Ana");
  await lisbonWithBia(ana);
  await createTrip(ana, "Rio", "BRL");
  await ana.getByRole("button", { name: "Back to your trips" }).click();
  await geminiWrote(ana, ["18,50 | açaí | Bia | lisboa | Bia"]);

  const sheet = ana.getByRole("dialog", { name: "From Gemini · 1" });
  await sheet.getByRole("button", { name: /açaí/ }).click();
  await expect(sheet.getByRole("button", { name: "Paid by" })).toHaveText("Bia");
  // A picked value sticks (the pick and its confirmation come in one tap).
  await sheet.getByRole("button", { name: "Paid by" }).click();
  await ana.getByRole("dialog", { name: "Paid by" }).getByRole("radio", { name: "You" }).click();
  await expect(sheet.getByRole("button", { name: "Paid by" })).toHaveText("You");
  await sheet.getByRole("button", { name: "Paid by" }).click();
  await ana.getByRole("dialog", { name: "Paid by" }).getByRole("radio", { name: "Bia" }).click();
  await expect(sheet.getByRole("button", { name: "Paid by" })).toHaveText("Bia");
  await sheet.getByRole("button", { name: "Trip" }).click();
  await ana.getByRole("dialog", { name: "Trip" }).getByRole("radio", { name: "Rio" }).click();
  await expect(sheet.getByRole("button", { name: "Paid by" })).toHaveText("You");
  await expect(sheet.getByRole("button", { name: "Split" })).toHaveText("Everyone");
  await expect(sheet.getByRole("button", { name: "Amount" })).toHaveText("R$18.50");

  await sheet.getByRole("button", { name: "Later" }).click();
  await expect(sheet).toBeHidden();
  expect(await calendarIds(ana)).toEqual(["ev0"]);
  // Later lasts for the visit, even through opening a trip and coming back.
  await ana.getByRole("main").getByRole("button", { name: /Rio/ }).click();
  await ana.getByRole("button", { name: "Back to your trips" }).click();
  await expect(ana.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await expect(sheet).toBeHidden();
  await ana.reload();
  // Back next time, as Gemini wrote it (changes made in the sheet are dropped).
  await expect(ana.getByRole("dialog", { name: "From Gemini · 1" }).getByText("Lisbon")).toBeVisible();
});

test("AST-1 the setup guide in Profile", async ({ browser }, info) => {
  const ana = await newUser(browser, "Ana");
  await ana.getByRole("button", { name: "Profile" }).click();
  await ana.getByRole("button", { name: "Add expenses with Gemini" }).click();
  const guide = ana.getByRole("dialog", { name: "Add expenses with Gemini" });
  await expect(
    guide.getByText("amount | what | split with | trip | paid by", { exact: false }),
  ).toBeVisible();
  await guide.getByRole("button", { name: "Allow calendar access" }).click();
  await expect(guide.getByRole("button", { name: "Allowed" })).toBeDisabled();
  await expect(guide.getByText("The “Evenly” calendar is on this phone.")).toBeVisible();
  await ana.screenshot({ path: info.outputPath("gemini-setup.png") });
});

test("AST-6 the review in the dark theme", async ({ browser }, info) => {
  const ana = await newUser(browser, "Ana");
  await ana.emulateMedia({ colorScheme: "dark" });
  await lisbonWithBia(ana);
  await geminiWrote(ana, ["60 | dinner | | |", "25 | taxi | bea | |"]);
  const sheet = ana.getByRole("dialog", { name: "From Gemini · 2" });
  await sheet.getByRole("button", { name: /taxi/ }).click();
  await ana.screenshot({ path: info.outputPath("gemini-review-dark.png") });
});
