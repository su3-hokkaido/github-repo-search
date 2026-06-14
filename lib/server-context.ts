// Server-only access to the GitHub token and Cloudflare bindings.
//
// In production (Cloudflare Workers) and in `next dev` (via the OpenNext dev
// hook), values come from the Cloudflare request context. Outside that context
// (e.g. unit tests), we fall back to process.env and an in-memory cache.

import type { KVLike } from "./cache";

export interface ServerEnv {
  githubToken?: string;
  cacheKv?: KVLike;
  rateLimitKv?: KVLike;
}

export async function getServerEnv(): Promise<ServerEnv> {
  try {
    // Imported lazily so this module loads cleanly in non-Workers test envs.
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    return {
      githubToken: (env as Record<string, unknown>).GITHUB_TOKEN as
        | string
        | undefined,
      cacheKv: (env as Record<string, unknown>).CACHE_KV as KVLike | undefined,
      rateLimitKv: (env as Record<string, unknown>).RATE_LIMIT_KV as
        | KVLike
        | undefined,
    };
  } catch {
    // No Cloudflare context (tests, or plain Node). Use process.env.
    return { githubToken: process.env.GITHUB_TOKEN };
  }
}
