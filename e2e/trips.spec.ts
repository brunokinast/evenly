import { expect, test } from "@playwright/test";
import { addExpense, createTrip, inviteCode, join, newUser, pickYesterday, tab } from "./helpers";

test("TRIP-1 TRIP-10 creating a trip stays on Home with it on top; Members shows the invite card", async ({
  browser,
}, info) => {
  const ana = await newUser(browser, "Ana");
  // trips.md flow 3: creating stays on Home, with the new trip listed and a notice.
  await ana.getByRole("button", { name: "New trip" }).click();
  await ana.getByRole("textbox", { name: "Trip name" }).fill("Older trip");
  await ana.getByRole("button", { name: "Create trip" }).click();
  await expect(ana.getByText("Older trip created")).toBeVisible();
  await expect(ana.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await expect(ana.getByRole("main").getByText("Older trip")).toBeVisible();
  await createTrip(ana, "Lisbon");
  await expect(ana.getByRole("tab", { name: "Members" })).toHaveAttribute("aria-selected", "true");
  await expect(ana.getByText("Invite friends")).toBeVisible();
  await ana.screenshot({ path: info.outputPath("trip-new-members.png") });
  await ana.getByRole("button", { name: "Back to your trips" }).click();
  const rows = ana.getByRole("main").getByRole("button");
  await expect(rows.first()).toContainText("Lisbon");
  await expect(rows.nth(1)).toContainText("Older trip");
  await ana.screenshot({ path: info.outputPath("home-list.png") });
});

test("TRIP-2 a trip name is required", async ({ browser }) => {
  const ana = await newUser(browser, "Ana");
  await ana.getByRole("button", { name: "New trip" }).click();
  await ana.getByRole("button", { name: "Create trip" }).click();
  await expect(ana.getByRole("alert")).toHaveText("Enter a trip name.");
});

test("INV-1..7 MEM-1 MEM-7 TRIP-5 invite, preview, claim a guest and join live", async ({
  browser,
}, info) => {
  const ana = await newUser(browser, "Ana");
  const bia = await newUser(browser, "Bia");
  await createTrip(ana, "Lisbon", "EUR");

  // MEM-1: the owner adds guests; the field stays focused for the next one.
  const guestField = ana.getByRole("textbox", { name: "Guest name" });
  await guestField.fill("Gus");
  await guestField.press("Enter");
  await expect(ana.getByRole("tabpanel").getByText("Gus")).toBeVisible();
  await guestField.fill("gus");
  await guestField.press("Enter");
  await expect(ana.getByRole("alert")).toHaveText("There's already a guest called gus.");
  await guestField.fill("Bea");
  await guestField.press("Enter");
  await expect(ana.getByRole("tabpanel").getByText("Bea")).toBeVisible();

  const code = await inviteCode(ana);
  // INV-2: opening Invite again shows the same code.
  expect(await inviteCode(ana)).toBe(code);

  // INV-4: a wrong code.
  await bia.getByRole("button", { name: "Join trip" }).click();
  await bia.getByRole("textbox", { name: "Invite code" }).fill(code === "000000" ? "111111" : "000000");
  await expect(bia.getByRole("alert")).toHaveText("Invalid or expired invite code");
  // INV-3: paste keeps the first 6 digits; the preview shows name, currency and guests (INV-5).
  await bia.getByRole("textbox", { name: "Invite code" }).fill(`Use invite code: ${code}`);
  const dialog = bia.getByRole("dialog", { name: "Join trip" });
  await expect(dialog.getByText("Lisbon")).toBeVisible();
  await expect(dialog.getByText("EUR")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Gus" })).toBeVisible();
  // INV-3: the code is done, so the keyboard closes.
  await expect(bia.getByRole("textbox", { name: "Invite code" })).not.toBeFocused();
  await dialog.getByRole("button", { name: "Bea" }).click();
  await expect(dialog.getByRole("button", { name: "Join as Bea" })).toBeVisible();
  await bia.screenshot({ path: info.outputPath("join-preview.png") });
  await dialog.getByRole("button", { name: "Join as Bea" }).click();
  await expect(bia.getByRole("heading", { name: "Lisbon" })).toBeVisible();

  // INV-6, MEM-7: Ana sees Bia live, in Bea's place, no longer a guest.
  await expect(ana.getByRole("tabpanel").getByText("Bia")).toBeVisible();
  await expect(ana.getByRole("tabpanel").getByText("Bea")).toBeHidden();
  await expect(ana.getByRole("heading", { name: "3 members" })).toBeVisible();
  // MEM-6: everyone sees themself first, then join order (Bia took Bea's place, after Gus).
  await expect(ana.getByRole("tabpanel")).toHaveText(/Ana[\s\S]*Gus[\s\S]*Bia/);
  await tab(bia, "Members");
  await expect(bia.getByRole("tabpanel")).toHaveText(/Bia[\s\S]*Ana[\s\S]*Gus/);
  await ana.screenshot({ path: info.outputPath("members-owner.png") });

  // TRIP-5: on Bia's Home right away.
  await bia.getByRole("button", { name: "Back to your trips" }).click();
  await expect(bia.getByRole("main").getByText("Lisbon")).toBeVisible();

  // INV-7: joining again says you're already a member.
  await bia.getByRole("button", { name: "Join trip" }).click();
  await bia.getByRole("textbox", { name: "Invite code" }).fill(code);
  await expect(bia.getByText("You're already a member of Lisbon")).toBeVisible();
  await bia.getByRole("button", { name: "Open trip" }).click();
  await expect(bia.getByRole("heading", { name: "Lisbon" })).toBeVisible();

  // TRIP-6: no owner actions for Bia.
  await expect(bia.getByRole("button", { name: "Invite", exact: true })).toBeHidden();
  await bia.getByRole("button", { name: "Trip options" }).click();
  await expect(bia.getByRole("button", { name: "Leave trip" })).toBeVisible();
  await expect(bia.getByRole("button", { name: "Delete trip" })).toBeHidden();
});

test("EXP BAL expenses, details, custom split, edit, delete and balances, live for everyone", async ({
  browser,
}, info) => {
  const ana = await newUser(browser, "Ana");
  const bia = await newUser(browser, "Bia");
  await createTrip(ana, "Porto", "USD");
  await ana.getByRole("textbox", { name: "Guest name" }).fill("Gus");
  await ana.getByRole("textbox", { name: "Guest name" }).press("Enter");
  await expect(ana.getByRole("tabpanel").getByText("Gus")).toBeVisible();
  const code = await inviteCode(ana);
  await join(bia, code, "Porto");

  // EXP-9, EXP-10, BAL-7: Ana adds $100.00 split between all three.
  await tab(ana, "Expenses");
  await ana.getByRole("button", { name: "Add expense" }).click();
  await expect(ana.getByRole("textbox", { name: "Amount" })).toBeFocused();
  await ana.keyboard.type("10000");
  await expect(ana.getByRole("textbox", { name: "Amount" })).toHaveValue("$100.00");
  await expect(ana.getByText("Each person pays $33.33 ($0.01 extra to You)")).toBeVisible();
  await ana.screenshot({ path: info.outputPath("expense-new.png") });
  await ana.keyboard.press("Enter");
  await expect(ana.getByRole("textbox", { name: "What was it for?" })).toBeFocused();
  await ana.keyboard.type("Dinner");
  await ana.keyboard.press("Enter");
  // EXP-9: Enter on the description closes the keyboard and stays; Save saves.
  await expect(ana.getByRole("textbox", { name: "What was it for?" })).not.toBeFocused();
  await expect(ana.getByRole("heading", { name: "New expense" })).toBeVisible();
  await ana.getByRole("button", { name: "Save" }).click();
  await expect(ana.getByRole("button", { name: /Dinner/ })).toBeVisible();
  await expect(ana.getByText("Split between all")).toBeVisible();

  // EXP-3: Bia sees it live; BAL-7, BAL-8: she pays Ana $33.33.
  await tab(bia, "Expenses");
  await expect(bia.getByRole("button", { name: /Dinner/ })).toBeVisible();
  await tab(bia, "Balances");
  await expect(bia.getByText("You pay Ana")).toBeVisible();
  await expect(bia.getByText("Gus pays Ana")).toBeVisible();
  // BAL-6: balances in the MEM-6 order, not by amount: You (Bia), then Ana, then Gus.
  const balanceRows = bia
    .getByRole("tabpanel")
    .locator("section", { has: bia.getByRole("heading", { name: "Balances" }) })
    .locator(":scope > div > *");
  await expect(balanceRows).toHaveText([/You/, /Ana/, /Gus/]);
  // design.md "Balances tab order": balances, then your payments, then other payments.
  await expect(bia.getByRole("tabpanel").getByRole("heading")).toHaveText([
    /Balances/i,
    /Your payments/i,
    /Other payments/i,
  ]);
  // design.md "Add expense button": only on the Expenses tab.
  await expect(bia.getByRole("button", { name: "Add expense" })).toBeHidden();
  await bia.screenshot({ path: info.outputPath("balances-bia.png") });
  await tab(ana, "Balances");
  await expect(ana.getByText("Bia pays you")).toBeVisible();
  await expect(ana.getByText("$66.66")).toBeVisible();
  await ana.screenshot({ path: info.outputPath("balances-ana.png") });

  // EXP-15: details, then Edit; custom split (EXP-12).
  await tab(ana, "Expenses");
  await ana.getByRole("button", { name: /Dinner/ }).click();
  const details = ana.getByRole("dialog", { name: "Dinner" });
  // EXP flow 2: payer under the amount; shares in the MEM-6 order, my own first.
  await expect(details.getByText("Paid by You")).toBeVisible();
  await expect(details.locator("section > div > *")).toHaveText([
    /You.*\$33\.34/,
    /Gus.*\$33\.33/,
    /Bia.*\$33\.33/,
  ]);
  await ana.screenshot({ path: info.outputPath("expense-details.png") });
  await details.getByRole("button", { name: "Edit" }).click();
  await expect(ana.getByRole("heading", { name: "Edit expense" })).toBeVisible();
  // EXP-9: Edit opens without the keyboard.
  await expect(ana.getByRole("textbox", { name: "Amount" })).not.toBeFocused();
  await ana.getByRole("button", { name: /Split/ }).click();
  await ana.getByRole("button", { name: "Custom amounts" }).click();
  const biaAmount = ana.getByRole("textbox", { name: "Amount for Bia" });
  await biaAmount.click();
  await ana.keyboard.type("5000");
  await expect(biaAmount).toHaveValue("50.00");
  await expect(ana.getByRole("textbox", { name: "Amount for Gus" })).toHaveAttribute("placeholder", "25.00");
  await expect(ana.getByText("Adds up to the total.")).toBeVisible();
  await ana.screenshot({ path: info.outputPath("split-custom.png") });
  await ana.getByRole("button", { name: "Done" }).click();
  await ana.getByRole("button", { name: "Save" }).click();
  await expect(ana.getByText("Custom split")).toBeVisible();
  await tab(bia, "Balances");
  await expect(bia.getByText("You pay Ana")).toBeVisible();
  await expect(bia.getByRole("tabpanel").getByText("$50.00").first()).toBeVisible();

  // EXP-13: changing the total of a custom split resets it to equal.
  await ana.getByRole("button", { name: /Dinner/ }).click();
  await ana.getByRole("dialog", { name: "Dinner" }).getByRole("button", { name: "Edit" }).click();
  // Edit opens without focus (EXP-9): tap the amount first, like a person would.
  await ana.getByRole("textbox", { name: "Amount" }).click();
  await ana.keyboard.press("Backspace");
  await expect(ana.getByText("Split reset to equal")).toBeVisible();
  await expect(ana.getByRole("button", { name: /Split/ })).toContainText("Equally between all");

  // Discard changes asks first (EXP flow 5).
  await ana.getByRole("button", { name: "Close" }).click();
  await ana.getByRole("button", { name: "Discard" }).click();
  await expect(ana.getByRole("tab", { name: "Expenses" })).toBeVisible();

  // EXP flow 6: delete from the edit screen, after confirming.
  await ana.getByRole("button", { name: /Dinner/ }).click();
  await ana.getByRole("dialog", { name: "Dinner" }).getByRole("button", { name: "Edit" }).click();
  await ana.getByRole("button", { name: "Delete expense" }).click();
  await ana
    .getByRole("dialog", { name: "Delete expense?" })
    .getByRole("button", { name: "Delete expense" })
    .click();
  await expect(ana.getByText("No expenses yet. Tap Add expense to record the first one.")).toBeVisible();
  await expect(bia.getByText("All settled! No payments needed.")).toBeVisible();
});

test("EXP-11 EXP-17 date and time open as rows, with calendar, wheels and shortcuts", async ({
  browser,
}, info) => {
  const ana = await newUser(browser, "Ana");
  await createTrip(ana, "Prazo", "BRL");
  await tab(ana, "Expenses");
  await ana.getByRole("button", { name: "Add expense" }).click();
  await ana.getByRole("button", { name: /When/ }).click();
  const sheet = ana.getByRole("dialog", { name: "Date and time" });
  const dateRow = sheet.getByRole("button", { name: /^Date/ });
  const timeRow = sheet.getByRole("button", { name: /^Time/ });
  // Opens with both values filled in and nothing expanded.
  await expect(dateRow).toContainText("Today,");
  await expect(dateRow).toHaveAttribute("aria-expanded", "false");
  await expect(timeRow).toHaveAttribute("aria-expanded", "false");
  await expect(sheet.locator("[inert]")).toHaveCount(2); // both pickers closed and out of reach
  await sheet.screenshot({ path: info.outputPath("when-closed.png") });

  // The date opens a calendar; future months can't be reached.
  await dateRow.click();
  await expect(dateRow).toHaveAttribute("aria-expanded", "true");
  await expect(sheet.getByRole("button", { name: "Next month" })).toBeDisabled();
  await pickYesterday(ana);
  await expect(dateRow).toContainText("Yesterday,");
  await sheet.screenshot({ path: info.outputPath("when-date.png") });

  // The time opens wheels and closes the calendar; a shortcut moves them.
  await timeRow.click();
  await expect(dateRow).toHaveAttribute("aria-expanded", "false");
  await sheet.getByRole("button", { name: /Lunch/ }).click();
  await expect(timeRow).toContainText("12:30 PM");
  await expect(sheet.getByRole("button", { name: /Lunch/ })).toHaveAttribute("aria-pressed", "true");
  await expect(
    sheet.getByRole("listbox", { name: "Hour" }).getByRole("option", { selected: true }),
  ).toHaveText("12 PM");
  await expect(
    sheet.getByRole("listbox", { name: "Minute" }).getByRole("option", { selected: true }),
  ).toHaveText("30");
  await sheet.getByRole("listbox", { name: "Minute" }).getByRole("option", { name: "45" }).click();
  await expect(timeRow).toContainText("12:45 PM");
  await sheet.screenshot({ path: info.outputPath("when-time.png") });

  // Now goes back to today; a later time today is refused.
  await sheet.getByRole("button", { name: /Now/ }).click();
  await expect(dateRow).toContainText("Today,");
  await expect(sheet.getByRole("button", { name: "Done" })).toBeEnabled();
  if (new Date().getHours() < 23) {
    await sheet.getByRole("listbox", { name: "Hour" }).press("ArrowDown");
    await expect(sheet.getByRole("alert")).toHaveText("The date and time can't be in the future.");
    await expect(sheet.getByRole("button", { name: "Done" })).toBeDisabled();
    await sheet.getByRole("listbox", { name: "Hour" }).press("ArrowUp");
  }
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
});

test("EXP-14 expenses are grouped by day, newest first, with a total", async ({ browser }, info) => {
  const ana = await newUser(browser, "Ana");
  await createTrip(ana, "Serra", "BRL");
  await tab(ana, "Expenses");
  await addExpense(ana, "4550", "Lunch");
  await ana.getByRole("button", { name: "Add expense" }).click();
  await ana.keyboard.type("2000");
  await ana.getByRole("textbox", { name: "What was it for?" }).fill("Taxi");
  await ana.getByRole("button", { name: /When/ }).click();
  await ana.getByRole("button", { name: /^Date/ }).click();
  await pickYesterday(ana);
  await ana.getByRole("button", { name: "Done" }).click();
  await ana.getByRole("button", { name: "Save" }).click();
  await expect(ana.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(ana.getByRole("heading", { name: "Yesterday" })).toBeVisible();
  await expect(ana.getByText("Total spent", { exact: true })).toBeVisible();
  await expect(ana.getByText("2 expenses", { exact: true })).toBeVisible();
  await expect(ana.getByText("R$65.50")).toBeVisible();
  await ana.screenshot({ path: info.outputPath("expenses-list.png") });
});

test("MEM-5 MEM-9 TRIP-11 TRIP-7 leave, remove, rename and delete, live", async ({ browser }) => {
  const ana = await newUser(browser, "Ana");
  const bia = await newUser(browser, "Bia");
  const cai = await newUser(browser, "Cai");
  await createTrip(ana, "Rio");
  await ana.getByRole("textbox", { name: "Guest name" }).fill("Gus");
  await ana.getByRole("textbox", { name: "Guest name" }).press("Enter");
  const code = await inviteCode(ana);
  await join(bia, code, "Rio");
  await join(cai, code, "Rio");
  await tab(ana, "Expenses");
  await addExpense(ana, "3000", "Snacks");

  // MEM-5: a guest in an expense can't be removed.
  await tab(ana, "Members");
  await ana.getByRole("button", { name: /Gus/ }).click();
  await expect(ana.getByText("Gus is in 1 expense. Remove them from that expense first.")).toBeVisible();
  await expect(ana.getByRole("button", { name: "Remove from trip" })).toBeDisabled();
  await ana.keyboard.press("Escape");

  // MEM-5, MEM-9: Bia leaves → gone from her Home; she stays as a guest for Ana.
  await bia.getByRole("button", { name: "Trip options" }).click();
  await bia.getByRole("button", { name: "Leave trip" }).click();
  await bia.getByRole("dialog", { name: "Leave trip?" }).getByRole("button", { name: "Leave trip" }).click();
  await expect(bia.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await expect(bia.getByRole("main").getByText("Rio")).toBeHidden();
  await expect(ana.getByRole("button", { name: /Bia.*Guest/ })).toBeVisible();

  // MEM-5: the owner removes Cai, who becomes a guest and loses access at once.
  await ana.getByRole("button", { name: /Cai/ }).click();
  await ana.getByRole("button", { name: "Remove from trip" }).click();
  await ana
    .getByRole("dialog", { name: "Remove Cai?" })
    .getByRole("button", { name: "Remove from trip" })
    .click();
  await expect(cai.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await expect(cai.getByText("This trip is no longer available.")).toBeVisible();

  // INV-11: Bia rejoins and claims her old place.
  const again = await inviteCode(ana);
  await join(bia, again, "Rio", "Bia");

  // TRIP-11: rename shows live.
  await ana.getByRole("button", { name: "Trip options" }).click();
  await ana.getByRole("button", { name: "Rename trip" }).click();
  await ana.getByRole("textbox", { name: "Trip name" }).fill("Rio 2026");
  await ana.getByRole("textbox", { name: "Trip name" }).press("Enter");
  await expect(bia.getByRole("heading", { name: "Rio 2026" })).toBeVisible();

  // TRIP-7: delete after confirming; Bia is sent Home with a notice.
  await ana.getByRole("button", { name: "Trip options" }).click();
  await ana.getByRole("button", { name: "Delete trip" }).click();
  await ana
    .getByRole("dialog", { name: "Delete trip?" })
    .getByRole("button", { name: "Delete trip" })
    .click();
  await expect(ana.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await expect(bia.getByText("This trip is no longer available.")).toBeVisible();
  await expect(bia.getByRole("main").getByText("Rio 2026")).toBeHidden();
});

test("TRIP-9 an unknown trip shows Trip not found", async ({ browser }) => {
  const ana = await newUser(browser, "Ana");
  await ana.goto("/trip/doesnotexist");
  await expect(ana.getByRole("heading", { name: "Trip not found" })).toBeVisible();
  await ana.getByRole("link", { name: "Back to your trips" }).click();
  await expect(ana.getByRole("heading", { name: "Your trips" })).toBeVisible();
});

test("APP-6 offline shows the banner and disables network actions", async ({ browser }, info) => {
  const ana = await newUser(browser, "Ana");
  await ana.context().setOffline(true);
  await expect(ana.getByText("You're offline. Changes will be possible when you reconnect.")).toBeVisible();
  await expect(ana.getByRole("button", { name: "New trip" })).toBeDisabled();
  await ana.screenshot({ path: info.outputPath("offline.png") });
  await ana.context().setOffline(false);
  await expect(ana.getByRole("button", { name: "New trip" })).toBeEnabled();
});

test("PDF-1 PDF-3 export downloads the trip summary", async ({ browser }) => {
  const ana = await newUser(browser, "Ana");
  // Headless browsers can't show a share sheet; take the download path (PDF-4 on the web).
  await ana.evaluate(() => Object.defineProperty(navigator, "canShare", { value: undefined }));
  await createTrip(ana, "Lisbon 2026!");
  await tab(ana, "Expenses");
  await addExpense(ana, "1234", "Café");
  await tab(ana, "Balances");
  const download = ana.waitForEvent("download");
  await ana.getByRole("button", { name: "Export as PDF" }).click();
  expect((await download).suggestedFilename()).toBe("Lisbon_2026_summary.pdf");
});

test("ID-5 MEM-3 a new name shows live for the other members", async ({ browser }) => {
  const ana = await newUser(browser, "Ana");
  const bia = await newUser(browser, "Bia");
  await createTrip(ana, "Lagos");
  await join(bia, await inviteCode(ana), "Lagos");
  await bia.getByRole("button", { name: "Back to your trips" }).click();
  await bia.getByRole("button", { name: "Profile" }).click();
  await bia.getByRole("textbox", { name: "Your name" }).fill("Beatriz");
  await bia.getByRole("textbox", { name: "Your name" }).press("Enter");
  await expect(ana.getByRole("tabpanel").getByText("Beatriz")).toBeVisible();
});

test.describe("in Portuguese", () => {
  test.use({ locale: "pt-BR" });

  test("APP-1 EXP-2 texts and amounts follow the device language", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Qual é o seu nome?" })).toBeVisible();
    await page.getByRole("textbox", { name: "Qual é o seu nome?" }).fill("Ana");
    await page.keyboard.press("Enter");
    // Button labels are never cut (design.md "Bottom action bar"): at 360px wide the Portuguese labels
    // don't fit side by side, so the buttons stack.
    await page.setViewportSize({ width: 360, height: 760 });
    const joinBox = (await page.getByRole("button", { name: "Entrar na viagem" }).boundingBox())!;
    const newBox = (await page.getByRole("button", { name: "Nova viagem" }).boundingBox())!;
    expect(joinBox.y + joinBox.height).toBeLessThanOrEqual(newBox.y);
    expect(joinBox.width).toBeCloseTo(newBox.width, 0);
    await page.screenshot({ path: info.outputPath("home-pt.png") });
    await page.setViewportSize({ width: 412, height: 839 });
    await page.getByRole("button", { name: "Nova viagem" }).click();
    // TRIP-3: PT-BR defaults to BRL.
    await expect(page.getByRole("button", { name: "BRL", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("textbox", { name: "Nome da viagem" }).fill("Floripa");
    await page.getByRole("button", { name: "Criar viagem" }).click();
    await page
      .getByRole("main")
      .getByRole("button", { name: /Floripa/ })
      .click();
    await page.getByRole("tab", { name: "Despesas" }).click();
    await page.getByRole("button", { name: "Nova despesa" }).click();
    await page.keyboard.type("123456");
    await expect(page.getByRole("textbox", { name: "Valor" })).toHaveValue(/^R\$\s1\.234,56$/);
    await page.screenshot({ path: info.outputPath("expense-pt.png") });
  });
});

test("Android back returns where you came from, never to a screen you left", async ({ browser }) => {
  const ana = await newUser(browser, "Ana");
  await createTrip(ana, "Faro");
  await tab(ana, "Expenses");
  await addExpense(ana, "1000", "Fuel");
  // The form was popped after saving: back from the trip goes Home.
  await ana.goBack();
  await expect(ana.getByRole("heading", { name: "Your trips" })).toBeVisible();

  // Home → trip → details → Edit → Close → back: Home again.
  await ana.getByRole("main").getByRole("button", { name: /Faro/ }).click();
  await ana.getByRole("button", { name: /Fuel/ }).click();
  await ana.getByRole("dialog", { name: "Fuel" }).getByRole("button", { name: "Edit" }).click();
  await expect(ana.getByRole("heading", { name: "Edit expense" })).toBeVisible();
  await ana.getByRole("button", { name: "Close" }).click();
  await expect(ana.getByRole("heading", { name: "Faro" })).toBeVisible();
  await ana.goBack();
  await expect(ana.getByRole("heading", { name: "Your trips" })).toBeVisible();

  // The trip's back arrow pops to Home; forward then returns to the trip, not a duplicate Home.
  await ana.getByRole("main").getByRole("button", { name: /Faro/ }).click();
  await ana.getByRole("button", { name: "Back to your trips" }).click();
  await expect(ana.getByRole("heading", { name: "Your trips" })).toBeVisible();
  await ana.goForward();
  await expect(ana.getByRole("heading", { name: "Faro" })).toBeVisible();
});
