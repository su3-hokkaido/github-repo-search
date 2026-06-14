import { defineConfig, devices } from "@playwright/test";

// E2E tests intercept /api/* at the browser level (see e2e/*.spec.ts), so they
// run deterministically without a GitHub token or network access. They do need
// browsers installed: `pnpm exec playwright install`.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
