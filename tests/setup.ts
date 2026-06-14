// Global test setup: jest-dom matchers, MSW server lifecycle, and resetting
// in-memory singletons (cache, rate-limit dev store) between tests so the suite
// is order-independent.

import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { server } from "./mocks/server";
import { resetMemoryCache } from "@/lib/cache";
import { __resetRateLimitDevStore } from "@/lib/rate-limit";

// Fail tests on any request that is not explicitly mocked.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetMemoryCache();
  __resetRateLimitDevStore();
});
