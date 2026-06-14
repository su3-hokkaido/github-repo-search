import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchRepo, fetchSearch } from "@/lib/api-client";

const realFetch = global.fetch;
const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
});

afterEach(() => {
  global.fetch = realFetch;
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchSearch", () => {
  it("calls /api/search with q and page and returns parsed data", async () => {
    const payload = { items: [], totalCount: 0, page: 2, perPage: 100, pageCount: 0 };
    mockFetch.mockResolvedValue(json(payload));
    const { signal } = new AbortController();

    const result = await fetchSearch("react", 2, signal);

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith("/api/search?q=react&page=2", { signal });
  });

  it("maps 429 to a rate_limited ApiError carrying the body message", async () => {
    mockFetch.mockResolvedValue(json({ error: "Rate limit exceeded." }, 429));
    await expect(fetchSearch("react", 1)).rejects.toMatchObject({
      name: "ApiError",
      kind: "rate_limited",
      status: 429,
      message: "Rate limit exceeded.",
    });
  });

  it("maps 4xx to bad_request and 5xx to server", async () => {
    mockFetch.mockResolvedValueOnce(json({ error: "bad" }, 422));
    await expect(fetchSearch("x", 1)).rejects.toMatchObject({ kind: "bad_request" });

    mockFetch.mockResolvedValueOnce(json({ error: "boom" }, 503));
    await expect(fetchSearch("x", 1)).rejects.toMatchObject({ kind: "server" });
  });

  it("falls back to a default message on a non-JSON error body", async () => {
    mockFetch.mockResolvedValue(new Response("not json", { status: 500 }));
    const error = await fetchSearch("x", 1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });
});

describe("fetchRepo", () => {
  it("URL-encodes owner/repo and returns parsed detail", async () => {
    const detail = {
      id: 1,
      name: "react",
      fullName: "facebook/react",
      owner: { login: "facebook", avatarUrl: "x" },
      description: null,
      language: "JavaScript",
      stars: 1,
      watchers: 2,
      forks: 3,
      issues: 4,
      htmlUrl: "u",
    };
    mockFetch.mockResolvedValue(json(detail));

    const result = await fetchRepo("face book", "re/po");

    expect(result).toEqual(detail);
    expect(mockFetch).toHaveBeenCalledWith("/api/repos/face%20book/re%2Fpo", {
      signal: undefined,
    });
  });

  it("maps 404 to a not_found ApiError", async () => {
    mockFetch.mockResolvedValue(json({ error: "Repository not found." }, 404));
    await expect(fetchRepo("a", "b")).rejects.toMatchObject({
      kind: "not_found",
      status: 404,
    });
  });
});
