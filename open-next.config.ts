// OpenNext configuration for Cloudflare Workers.
//
// This file controls how the Next.js build output is adapted to run on the
// Cloudflare Workers runtime. The default configuration is sufficient to get
// started; caching can be enabled below once KV/R2 bindings are wired up.

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// To enable Next.js incremental cache backed by Cloudflare KV, uncomment the
// import and the `incrementalCache` option. This requires a KV binding named
// NEXT_INC_CACHE_KV in wrangler.jsonc.
//
// import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // incrementalCache: kvIncrementalCache,
});
