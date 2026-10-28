import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { join, newUser, tab } from "./helpers";

test.beforeAll(() => {
  execSync("node scripts/seed-demo.mjs");
});

test("demo trip: anyone can join with 123456 and see expenses and balances", async ({ browser }, info) => {
  const me = await newUser(browser, "Tester");
  await join(me, "123456", "Lisbon weekend (demo)");
  await tab(me, "Expenses");
  await expect(me.getByRole("button", { name: /Dinner at Time Out Market/ })).toBeVisible();
  await expect(me.getByText("Total spent · 6 expenses")).toBeVisible();
  await me.screenshot({ path: info.outputPath("demo-expenses.png") });
  await tab(me, "Balances");
  await expect(me.getByText("You're settled up")).toBeVisible();
  await me.screenshot({ path: info.outputPath("demo-balances.png") });
});
