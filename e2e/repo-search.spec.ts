import { test, expect, type Route } from "@playwright/test";

// Deterministic fixtures served by intercepting the app's own /api/* endpoints.
const searchPayload = {
  items: [
    {
      id: 1,
      name: "react",
      fullName: "facebook/react",
      // next/image only allows GitHub's avatar host (see next.config.ts), so the
      // fixture must use it or the image render throws and trips the error boundary.
      owner: {
        login: "facebook",
        avatarUrl: "https://avatars.githubusercontent.com/u/69631?v=4",
      },
      description: "The library for web and native UIs.",
      language: "JavaScript",
      stars: 230000,
      htmlUrl: "https://github.com/facebook/react",
    },
  ],
  totalCount: 1,
  page: 1,
  perPage: 100,
  pageCount: 1,
};

const detailPayload = {
  ...searchPayload.items[0],
  watchers: 6600,
  forks: 47000,
  issues: 900,
};

function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("search → results → detail page shows all fields, then back", async ({ page }) => {
  await page.route("**/api/search**", (route) => fulfillJson(route, searchPayload));
  await page.route("**/api/repos/**", (route) => fulfillJson(route, detailPayload));

  await page.goto("/search");

  await page
    .getByRole("textbox", { name: /search repositories/i })
    .fill("react");
  await page.getByRole("button", { name: /search/i }).click();

  await expect(page).toHaveURL(/[?&]q=react/);
  await expect(page.getByText("facebook/react")).toBeVisible();

  // Navigate to detail.
  await page.getByText("facebook/react").click();
  await expect(page).toHaveURL(/\/repos\/facebook\/react/);

  await expect(
    page.getByRole("heading", { name: "facebook/react" }),
  ).toBeVisible();

  // All four stats render.
  await expect(page.getByText("230,000")).toBeVisible(); // Stars
  await expect(page.getByText("6,600")).toBeVisible(); // Watchers (subscribers)
  await expect(page.getByText("47,000")).toBeVisible(); // Forks
  await expect(page.getByText("900")).toBeVisible(); // Issues

  // Back navigation.
  await page.getByRole("link", { name: /back to search/i }).click();
  await expect(page).toHaveURL(/\/search/);
});

test("missing repository shows a not-found message", async ({ page }) => {
  await page.route("**/api/repos/**", (route) =>
    fulfillJson(route, { error: "Repository not found." }, 404),
  );

  await page.goto("/repos/facebook/does-not-exist");
  await expect(page.getByText(/couldn’t find that repository/i)).toBeVisible();
});
