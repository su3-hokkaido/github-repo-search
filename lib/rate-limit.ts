// Application-layer rate limiting.
//
// Algorithm: sliding-window log. For each identifier we keep the timestamps of
// recent requests in an external store (Cloudflare KV in production). State is
// NEVER held in module memory in production, because Workers isolates are not
// sticky. The in-memory store here is a dev/test fallback only.
//
// Trade-off: KV is eventually consistent and read-modify-write is not atomic, so
// under heavy concurrency the limit is approximate. That is acceptable for this
// app's coarse per-IP protection; use a Durable Object or Upstash if you need
// strict, atomic counting.

import type { KVLike } from "./cache";
import { getServerEnv } from "./server-context";

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Key prefix, used to separate buckets per endpoint. */
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window frees up at least one slot. */
  resetSeconds: number;
  /** Present only when blocked. */
  retryAfterSeconds?: number;
}

/** Cloudflare KV requires an expiration TTL of at least 60 seconds. */
const MIN_KV_TTL_SECONDS = 60;

/** Core limiter. Pure aside from the injected store — fully unit-testable. */
export async function checkRateLimit(
  store: KVLike,
  identifier: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = options;
  const prefix = options.prefix ?? "rl";
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  const raw = await store.get(key);
  let timestamps: number[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t): t is number => typeof t === "number");
      }
    } catch {
      timestamps = [];
    }
  }

  // Drop entries that have fallen outside the window (kept in ascending order).
  const recent = timestamps.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
      retryAfterSeconds: resetSeconds,
    };
  }

  recent.push(now);
  await store.put(key, JSON.stringify(recent), {
    expirationTtl: Math.max(MIN_KV_TTL_SECONDS, windowSeconds),
  });

  const oldest = recent[0];
  const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  return {
    success: true,
    limit,
    remaining: limit - recent.length,
    resetSeconds,
  };
}

/** Build standard rate-limit response headers from a result. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetSeconds),
  };
  if (result.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}

/** Extract the client IP. Cloudflare sets `cf-connecting-ip`. */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// ----------------------------------------------------------------------------
// Store wiring
// ----------------------------------------------------------------------------

/** Minimal in-memory KV. Dev/test fallback ONLY — never used in production. */
export function createInMemoryKV(): KVLike {
  const map = new Map<string, { value: string; expiresAt: number }>();
  return {
    async get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        map.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key, value, options) {
      const ttl = options?.expirationTtl ?? MIN_KV_TTL_SECONDS;
      map.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    },
  };
}

let devStore: KVLike | null = null;

function getDevStore(): KVLike {
  if (!devStore) {
    devStore = createInMemoryKV();
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[rate-limit] No RATE_LIMIT_KV binding found; using an in-memory " +
          "store. This is NOT safe for production.",
      );
    }
  }
  return devStore;
}

/** Test helper: reset the in-memory dev store between tests. */
export function __resetRateLimitDevStore(): void {
  devStore = createInMemoryKV();
}

async function getRateLimitStore(): Promise<KVLike> {
  const { rateLimitKv } = await getServerEnv();
  return rateLimitKv ?? getDevStore();
}

/**
 * Wrap a Route Handler so requests are rate limited per client IP before the
 * handler runs. Adds X-RateLimit-* headers to successful responses and returns
 * 429 (with Retry-After) when the limit is exceeded.
 */
export function withRateLimit<TCtx = unknown>(
  handler: (request: Request, context: TCtx) => Promise<Response>,
  options: RateLimitOptions,
): (request: Request, context?: TCtx) => Promise<Response> {
  // Next.js only passes the context (route params) for dynamic routes, so the
  // wrapped handler must remain callable with the request alone.
  return async (request, context) => {
    const store = await getRateLimitStore();
    const identifier = getClientIp(request);
    const result = await checkRateLimit(store, identifier, options);
    const headers = rateLimitHeaders(result);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please retry later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
        },
      );
    }

    const response = await handler(request, context as TCtx);
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
    return response;
  };
}
