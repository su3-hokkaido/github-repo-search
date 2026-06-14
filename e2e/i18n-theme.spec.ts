import { test, expect } from "@playwright/test";

// These verify that the language (cookie) and theme (localStorage) choices
// persist across reloads. They drive the real app, so run locally with a built
// browser: `pnpm exec playwright install` then `pnpm exec playwright test`.

test("language choice persists across reloads", async ({ page }) => {
  await page.goto("/search");

  // Starts in English.
  await expect(
    page.getByRole("link", { name: "GitHub Repository Search" }),
  ).toBeVisible();
  await expect(
    page.getByText(/search github repositories by keyword/i),
  ).toBeVisible();

  // Switch to Japanese.
  await page
    .getByRole("combobox", { name: /language/i })
    .selectOption("ja");

  await expect(
    page.getByRole("link", { name: "GitHub リポジトリ検索" }),
  ).toBeVisible();
  await expect(
    page.getByText("キーワードで GitHub リポジトリを検索します。"),
  ).toBeVisible();

  // Reload: still Japanese (cookie-backed).
  await page.reload();
  await expect(
    page.getByRole("link", { name: "GitHub リポジトリ検索" }),
  ).toBeVisible();
});

test("theme choice persists across reloads", async ({ page }) => {
  await page.goto("/search");

  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: /toggle theme/i }).click();
  await expect(html).toHaveClass(/dark/);

  // Reload: still dark (localStorage-backed).
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});
