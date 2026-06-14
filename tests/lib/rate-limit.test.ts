import { describe, expect, it } from "vitest";
import { checkRateLimit, createInMemoryKV } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const store = createInMemoryKV();
    const options = { limit: 3, windowSeconds: 60, prefix: "t" };

    const r1 = await checkRateLimit(store, "ip", options);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit(store, "ip", options);
    expect(r2.remaining).toBe(1);

    const r3 = await checkRateLimit(store, "ip", options);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = await checkRateLimit(store, "ip", options);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks identifiers independently", async () => {
    const store = createInMemoryKV();
    const options = { limit: 1, windowSeconds: 60 };

    expect((await checkRateLimit(store, "a", options)).success).toBe(true);
    expect((await checkRateLimit(store, "b", options)).success).toBe(true);
    expect((await checkRateLimit(store, "a", options)).success).toBe(false);
  });

  it("reports a reset within the window on the first hit", async () => {
    const store = createInMemoryKV();
    const result = await checkRateLimit(store, "ip", {
      limit: 5,
      windowSeconds: 60,
    });
    expect(result.resetSeconds).toBeGreaterThan(0);
    expect(result.resetSeconds).toBeLessThanOrEqual(60);
  });
});
