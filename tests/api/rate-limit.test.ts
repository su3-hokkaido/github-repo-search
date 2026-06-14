import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/search/route";

function searchRequest(ip: string, query: string): Request {
  return new Request(
    `https://example.com/api/search?q=${query}&page=1`,
    { headers: { "x-forwarded-for": ip } },
  );
}

describe("rate limiting on /api/search", () => {
  it("returns 429 with Retry-After once the per-IP limit is exceeded", async () => {
    const ip = "203.0.113.7";
    let blocked: Response | null = null;

    // Limit is 30/min. Use distinct queries (same IP) so the cache never short
    // -circuits and every request counts against the limiter.
    for (let i = 0; i < 35; i++) {
      const res = await GET(searchRequest(ip, `term${i}`));
      if (res.status === 429) {
        blocked = res;
        break;
      }
      expect(res.status).toBe(200);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("30");
    }

    expect(blocked).not.toBeNull();
    expect(blocked?.headers.get("Retry-After")).not.toBeNull();
    expect(blocked?.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("does not block a different IP", async () => {
    const res = await GET(searchRequest("198.51.100.1", "independent"));
    expect(res.status).toBe(200);
  });
});
