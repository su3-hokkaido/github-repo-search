import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      // Cover the application logic. Infra/wiring and config that can only be
      // meaningfully exercised against a running Next/Cloudflare runtime are
      // excluded so the signal stays on code we can unit-test.
      include: ["lib/**", "components/**", "app/api/**"],
      exclude: [
        "lib/server-context.ts",
        // Thin wiring/glue exercised by E2E (providers, server actions, header).
        "components/theme-provider.tsx",
        "components/theme-toggle.tsx",
        "components/locale-switcher.tsx",
        "components/site-header.tsx",
        "**/*.d.ts",
        "tests/**",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
