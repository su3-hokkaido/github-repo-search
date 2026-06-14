// Short-TTL response cache.
//
// Used to cache shaped GitHub responses for a short window so repeated identical
// requests do not consume the GitHub API rate limit. Backed by Cloudflare KV in
// production; falls back to an in-memory store for local dev / tests.
//
// NOTE: The in-memory fallback is acceptable for *response caching* (a cache
// miss just means an extra upstream call). It is NOT acceptable for rate
// limiting (Phase 2), which must always use a shared external store.

/** Minimal structural type for a Cloudflare KV namespace (avoids a hard dep on
 *  @cloudflare/workers-types in this module). */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

export interface TtlCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

/** Cloudflare KV's minimum supported expiration TTL is 60 seconds. */
const MIN_KV_TTL_SECONDS = 60;

class KvCache implements TtlCache {
  constructor(private readonly kv: KVLike) {}

  get(key: string): Promise<string | null> {
    return this.kv.get(key);
  }

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    return this.kv.put(key, value, {
      expirationTtl: Math.max(MIN_KV_TTL_SECONDS, Math.floor(ttlSeconds)),
    });
  }
}

interface MemoryEntry {
  value: string;
  expiresAt: number; // epoch ms
}

class MemoryCache implements TtlCache {
  private readonly store = new Map<string, MemoryEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  clear(): void {
    this.store.clear();
  }
}

// Module-level singleton so the in-memory fallback persists across requests
// within a single process (dev/test).
const sharedMemoryCache = new MemoryCache();

/** Returns a KV-backed cache when a namespace is available, else in-memory. */
export function createCache(kv?: KVLike): TtlCache {
  return kv ? new KvCache(kv) : sharedMemoryCache;
}

/** Test helper: clear the shared in-memory cache between tests. */
export function resetMemoryCache(): void {
  sharedMemoryCache.clear();
}
