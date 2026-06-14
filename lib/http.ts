// HTTP helpers shared by the API route handlers.

import { GitHubApiError } from "./github";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

/** Pre-serialized body returned straight from cache, with a hit marker header. */
export function cachedJsonResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { ...JSON_HEADERS, "X-Cache": "HIT" },
  });
}

/** Map an upstream/GitHub error (or unknown error) to an HTTP response. */
export function errorToResponse(error: unknown): Response {
  if (error instanceof GitHubApiError) {
    switch (error.kind) {
      case "rate_limited": {
        const headers: Record<string, string> = {};
        if (error.retryAfterSeconds !== undefined) {
          headers["Retry-After"] = String(error.retryAfterSeconds);
        }
        return jsonResponse(
          { error: "Rate limit exceeded. Please retry later." },
          429,
          headers,
        );
      }
      case "not_found":
        return jsonResponse({ error: "Repository not found." }, 404);
      case "invalid_query":
        return jsonResponse({ error: "Invalid search query." }, 400);
      case "upstream":
      default:
        return jsonResponse({ error: "Upstream GitHub API error." }, 502);
    }
  }

  // AbortError (client navigated away / timeout) or anything unexpected.
  if (error instanceof Error && error.name === "AbortError") {
    return jsonResponse({ error: "Request aborted." }, 499);
  }

  return jsonResponse({ error: "Internal server error." }, 500);
}
