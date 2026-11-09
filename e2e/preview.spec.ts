import { expect, test } from "@playwright/test";

// Runs in Preview mode (no Supabase env). Supabase journeys are covered by supabase/tests/game_flow_test.sql
// and the manual two-device checklist in PROJECT_STATUS.md.

test("boarding pass issues the carry-on and opens the anniversary letter on schedule", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-13T23:59:59+05:30"));
  await page.goto("/");
  await expect(page.getByText("Ticket issues in")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your carry-on" })).toHaveCount(0);

  await page.clock.setFixedTime(new Date("2026-11-14T00:00:00+05:30"));
  await expect(page.getByRole("heading", { name: "Your carry-on" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Now boarding" })).toHaveCount(0);

  await page.clock.setFixedTime(new Date("2026-11-16T00:00:00+05:30"));
  await page.getByRole("button", { name: "Now boarding" }).click();
  await page.getByRole("button", { name: "Open the envelope" }).click();
  await expect(page.getByText(/you became my favourite person/)).toBeVisible();
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

test("secret hunt preserves partial progress and unlocks the review after all five clues", async ({ page }) => {
  // Preview has no multiplayer backend. Supply the persisted result of a completed quiz.
  await page.addInitScript(() => {
    if (!localStorage.getItem("olu:unlocks")) localStorage.setItem("olu:unlocks", JSON.stringify(["game-champion"]));
  });
  await page.goto("/secret");
  await expect(page.getByText("1 of 5 discoveries found")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review locked" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Find the memory counter" })).toBeVisible();

  await page.getByRole("button", { name: "Show star hint" }).click();
  await expect(page.getByText("Look near the upper-left edge of the sky.")).toBeVisible();
  await page.getByRole("button", { name: "Star 1", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Star 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  for (let i = 2; i <= 7; i++) await page.getByRole("button", { name: `Star ${i}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Hidden stars" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Hidden stars" })).toBeHidden();

  const moon = page.getByRole("button", { name: "The moon", exact: true });
  for (let i = 0; i < 5; i++) await moon.click();
  await expect(page.getByRole("dialog", { name: "The moon" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "The moon" })).toBeHidden();
  await page.getByRole("button", { name: "Unseal the letter" }).click();
  await expect(page.getByRole("dialog", { name: "Secret letter" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Secret letter" })).toBeHidden();
  await expect(page.getByText("4 of 5 discoveries found")).toBeVisible();

  await page.getByRole("link", { name: "Find the memory counter" }).click();
  const counter = page.getByRole("button", { name: /moments? illuminated/ });
  for (let i = 0; i < 3; i++) await counter.click();
  await expect(page.getByText("You found a hidden photograph.", { exact: false })).toBeVisible();
  await page.goto("/secret");
  await expect(page.getByText("5 of 5 discoveries found")).toBeVisible();
  await page.getByRole("button", { name: "Watch the review" }).click();
  await expect(page.getByRole("dialog", { name: "Year One Relationship Review" })).toBeVisible();
  for (const title of ["One trip around the sun", "Somewhere in the good part", "And the award goes to…", "Five stars. Would fall again.", "See you in Year Two"]) {
    await page.getByRole("button", { name: "Next slide" }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Watch again" }).click();
  await expect(page.getByRole("heading", { name: "Our Little Universe" })).toBeVisible();
});
