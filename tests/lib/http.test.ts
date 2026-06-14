import { describe, expect, it } from "vitest";
import { cachedJsonResponse, errorToResponse, jsonResponse } from "@/lib/http";
import { GitHubApiError } from "@/lib/github";

describe("jsonResponse", () => {
  it("sets JSON content-type, status, and extra headers", async () => {
    const res = jsonResponse({ ok: true }, 201, { "X-Cache": "MISS" });
    expect(res.status).toBe(201);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("X-Cache")).toBe("MISS");
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("cachedJsonResponse", () => {
  it("returns the body verbatim with an X-Cache HIT marker", async () => {
    const body = JSON.stringify({ cached: 1 });
    const res = cachedJsonResponse(body);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache")).toBe("HIT");
    expect(await res.text()).toBe(body);
  });
});

describe("errorToResponse", () => {
  it("maps rate_limited to 429 with Retry-After when provided", () => {
    const res = errorToResponse(new GitHubApiError("rate_limited", 429, "x", 30));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("maps rate_limited to 429 without Retry-After when omitted", () => {
    const res = errorToResponse(new GitHubApiError("rate_limited", 429, "x"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeNull();
  });

  it("maps not_found to 404", () => {
    expect(errorToResponse(new GitHubApiError("not_found", 404, "x")).status).toBe(404);
  });

  it("maps invalid_query to 400", () => {
    expect(errorToResponse(new GitHubApiError("invalid_query", 422, "x")).status).toBe(400);
  });

  it("maps upstream to 502", () => {
    expect(errorToResponse(new GitHubApiError("upstream", 502, "x")).status).toBe(502);
  });

  it("maps an AbortError to 499", () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    expect(errorToResponse(error).status).toBe(499);
  });

  it("maps an unknown error to 500", () => {
    expect(errorToResponse(new Error("boom")).status).toBe(500);
  });
});
