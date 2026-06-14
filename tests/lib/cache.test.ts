import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCache, resetMemoryCache, type KVLike } from "@/lib/cache";

describe("createCache (in-memory fallback)", () => {
  beforeEach(() => resetMemoryCache());

  it("stores and retrieves a value", async () => {
    const cache = createCache();
    await cache.set("k", "v", 60);
    expect(await cache.get("k")).toBe("v");
  });

  it("returns null for a missing key", async () => {
    expect(await createCache().get("absent")).toBeNull();
  });

  it("expires entries once the TTL elapses", async () => {
    vi.useFakeTimers();
    try {
      const cache = createCache();
      await cache.set("k", "v", 60);
      vi.advanceTimersByTime(59_000);
      expect(await cache.get("k")).toBe("v");
      vi.advanceTimersByTime(2_000);
      expect(await cache.get("k")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("createCache (Cloudflare KV)", () => {
  function fakeKv() {
    const store = new Map<string, string>();
    const puts: Array<{ key: string; value: string; ttl?: number }> = [];
    const kv: KVLike = {
      async get(key) {
        return store.get(key) ?? null;
      },
      async put(key, value, options) {
        store.set(key, value);
        puts.push({ key, value, ttl: options?.expirationTtl });
      },
    };
    return { kv, puts };
  }

  it("delegates get/put to the namespace", async () => {
    const { kv, puts } = fakeKv();
    const cache = createCache(kv);
    await cache.set("k", "v", 120);
    expect(await cache.get("k")).toBe("v");
    expect(puts[0]).toMatchObject({ key: "k", value: "v", ttl: 120 });
  });

  it("clamps the TTL to KV's 60s minimum and floors fractional seconds", async () => {
    const { kv, puts } = fakeKv();
    const cache = createCache(kv);
    await cache.set("a", "1", 5);
    await cache.set("b", "2", 90.7);
    expect(puts[0].ttl).toBe(60);
    expect(puts[1].ttl).toBe(90);
  });
});
