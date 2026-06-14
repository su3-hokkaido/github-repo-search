// GET /api/repos/<owner>/<repo>
//
// Proxies the GitHub single-repository endpoint and returns the detail fields
// the UI needs (name, owner avatar, language, stars, watchers, forks, issues).
// Rate limited per client IP.

import { getRepository } from "@/lib/github";
import { createCache } from "@/lib/cache";
import { getServerEnv } from "@/lib/server-context";
import { jsonResponse, cachedJsonResponse, errorToResponse } from "@/lib/http";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CACHE_TTL_SECONDS = 60;

// Per-IP limit for the detail endpoint (higher than search; cheaper upstream).
const RATE_LIMIT = { limit: 60, windowSeconds: 60, prefix: "rl:repo" };

type RouteContext = { params: Promise<{ owner: string; repo: string }> };

async function handleRepoDetail(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { owner, repo } = await context.params;

  if (!owner || !repo) {
    return jsonResponse({ error: "Owner and repo are required." }, 400);
  }

  const { githubToken, cacheKv } = await getServerEnv();
  const cache = createCache(cacheKv);
  const cacheKey = `repo:v1:${owner.toLowerCase()}/${repo.toLowerCase()}`;

  const cached = await cache.get(cacheKey);
  if (cached) return cachedJsonResponse(cached);

  try {
    const detail = await getRepository({
      owner,
      repo,
      token: githubToken,
      signal: request.signal,
    });

    const body = JSON.stringify(detail);
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

export const GET = withRateLimit<RouteContext>(handleRepoDetail, RATE_LIMIT);
