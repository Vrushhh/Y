import { expect, test } from "@playwright/test";

// Runs in Preview mode (no Supabase env). Supabase journeys are covered by supabase/tests/game_flow_test.sql
// and the manual two-device checklist in PROJECT_STATUS.md.

test("welcome intro opens and enters the universe", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the envelope" }).click();
  await expect(page.getByText("you became my favourite person")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Enter our universe" }).click();
  await expect(page).toHaveURL(/\/universe/);
  await expect(page.getByText("days together").first()).toBeVisible();
  await expect(page.getByText("Preview mode")).toBeVisible();
});

test("every route renders", async ({ page }) => {
  for (const path of ["/universe", "/memories", "/date-mode", "/letters", "/photobooth", "/timeline", "/reasons", "/soundtrack", "/bucket-list", "/time-capsule", "/secret", "/settings", "/login"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first(), path).toBeVisible();
  }
});

test("reasons jar persists a new reason", async ({ page }) => {
  await page.goto("/reasons");
  await page.getByRole("button", { name: "Add a reason" }).click();
  await page.getByPlaceholder("I love you because…").fill("Because e2e tests pass");
  await page.getByRole("button", { name: "Drop it in the jar" }).click();
  await expect(page.getByText("6", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("6", { exact: true })).toBeVisible();
});

test("bucket list item can be completed", async ({ page }) => {
  await page.goto("/bucket-list");
  await page.getByRole("button", { name: "Mark as done" }).first().click();
  await expect(page.getByText("1 of 4 done")).toBeVisible();
});

test("time capsule stays sealed", async ({ page }) => {
  await page.goto("/time-capsule");
  await page.getByRole("button", { name: "Seal a message" }).first().click();
  await page.getByLabel("Message", { exact: true }).fill("open me later");
  const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  await page.getByLabel("Opens on").fill(future);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Seal it" }).click();
  await expect(page.getByRole("button", { name: /A message for later/ })).toBeVisible();
  await expect(page.getByText("open me later")).toHaveCount(0);
});

test("moon secret unlocks", async ({ page }) => {
  await page.goto("/secret");
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "The moon", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "The moon" })).toBeVisible();
});
