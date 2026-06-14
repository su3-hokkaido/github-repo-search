import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/repos/[owner]/[repo]/route";

function makeRequest(): Request {
  return new Request("https://example.com/api/repos/facebook/react");
}

describe("GET /api/repos/[owner]/[repo]", () => {
  it("returns shaped repository detail", async () => {
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ owner: "facebook", repo: "react" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fullName).toBe("facebook/react");
    expect(body.watchers).toBe(6600); // subscribers_count
    expect(body.issues).toBe(900);
  });

  it("returns 404 for a missing repository", async () => {
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ owner: "facebook", repo: "__missing__" }),
    });
    expect(res.status).toBe(404);
  });
});
