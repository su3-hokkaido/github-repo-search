import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/search/route";

function makeRequest(query: string): Request {
  return new Request(`https://example.com/api/search?${query}`);
}

describe("GET /api/search", () => {
  it("returns 400 when q is missing", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns shaped results with pagination metadata", async () => {
    const res = await GET(makeRequest("q=react&page=1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.perPage).toBe(100);
    expect(body.pageCount).toBe(10); // 4521 results -> capped at 10 pages
    expect(body.items).toHaveLength(2);
    expect(res.headers.get("X-Cache")).toBe("MISS");
  });

  it("serves a cache hit on the second identical request", async () => {
    await GET(makeRequest("q=cachetest&page=1"));
    const res = await GET(makeRequest("q=cachetest&page=1"));
    expect(res.headers.get("X-Cache")).toBe("HIT");
  });

  it("returns 429 with Retry-After when GitHub is rate limited", async () => {
    const res = await GET(makeRequest("q=__ratelimit__&page=1"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
  });

  it("maps an invalid GitHub query to 400", async () => {
    const res = await GET(makeRequest("q=__invalid__&page=1"));
    expect(res.status).toBe(400);
  });
});
