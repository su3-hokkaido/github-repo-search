// GET /api/search?q=<keyword>&page=<n>
//
// Proxies the GitHub repository search API. Keeps the GitHub token server-side,
// rate limits per client IP, caches results briefly, and normalizes errors.

import {
  searchRepositories,
  computePageCount,
  clampPage,
  PER_PAGE,
} from "@/lib/github";
import { createCache } from "@/lib/cache";
import { getServerEnv } from "@/lib/server-context";
import { jsonResponse, cachedJsonResponse, errorToResponse } from "@/lib/http";
import { withRateLimit } from "@/lib/rate-limit";

// Always run per-request (never statically optimized at build time).
export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 256;
const CACHE_TTL_SECONDS = 60;

// Per-IP limit for the search endpoint.
const RATE_LIMIT = { limit: 30, windowSeconds: 60, prefix: "rl:search" };

async function handleSearch(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const requestedPage = Number(searchParams.get("page") ?? "1");

  // --- Validation -----------------------------------------------------------
  if (!query) {
    return jsonResponse({ error: "Query parameter 'q' is required." }, 400);
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return jsonResponse(
      { error: `Query must be at most ${MAX_QUERY_LENGTH} characters.` },
      400,
    );
  }

  const page = clampPage(requestedPage);

  const { githubToken, cacheKv } = await getServerEnv();
  const cache = createCache(cacheKv);
  const cacheKey = `search:v1:${PER_PAGE}:${page}:${query.toLowerCase()}`;

  // --- Cache ----------------------------------------------------------------
  const cached = await cache.get(cacheKey);
  if (cached) return cachedJsonResponse(cached);

  // --- Fetch + shape --------------------------------------------------------
  try {
    const { items, totalCount } = await searchRepositories({
      query,
      page,
      token: githubToken,
      signal: request.signal,
    });

    const body = JSON.stringify({
      items,
      totalCount,
      page,
      perPage: PER_PAGE,
      pageCount: computePageCount(totalCount),
    });

    await cache.set(cacheKey, body, CACHE_TTL_SECONDS);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

export const GET = withRateLimit(handleSearch, RATE_LIMIT);
