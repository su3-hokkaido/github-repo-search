import { describe, expect, it } from "vitest";
import {
  clampPage,
  computePageCount,
  getRepository,
  GitHubApiError,
  MAX_PAGES,
  searchRepositories,
} from "@/lib/github";

describe("computePageCount", () => {
  it("returns 0 for no results", () => {
    expect(computePageCount(0)).toBe(0);
  });

  it("rounds up partial pages", () => {
    expect(computePageCount(150)).toBe(2);
    expect(computePageCount(100)).toBe(1);
    expect(computePageCount(101)).toBe(2);
  });

  it("caps at the 1000-result window (10 pages)", () => {
    expect(computePageCount(999999)).toBe(MAX_PAGES);
    expect(computePageCount(1001)).toBe(MAX_PAGES);
  });

  it("handles invalid input", () => {
    expect(computePageCount(NaN)).toBe(0);
    expect(computePageCount(-5)).toBe(0);
  });
});

describe("clampPage", () => {
  it("clamps to [1, MAX_PAGES]", () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-3)).toBe(1);
    expect(clampPage(5)).toBe(5);
    expect(clampPage(11)).toBe(MAX_PAGES);
    expect(clampPage(NaN)).toBe(1);
    expect(clampPage(2.9)).toBe(2);
  });
});

describe("searchRepositories", () => {
  it("maps items to the shaped list type", async () => {
    const result = await searchRepositories({ query: "react", page: 1 });
    expect(result.totalCount).toBe(4521);
    expect(result.items).toHaveLength(2);
    const [first] = result.items;
    expect(first.fullName).toBe("facebook/react");
    expect(first.owner.avatarUrl).toBe("https://avatars.example/fb.png");
    expect(first.stars).toBe(230000);
  });

  it("returns empty items for no matches", async () => {
    const result = await searchRepositories({ query: "__empty__", page: 1 });
    expect(result.totalCount).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("throws a rate_limited error on 403 with no remaining quota", async () => {
    await expect(
      searchRepositories({ query: "__ratelimit__", page: 1 }),
    ).rejects.toMatchObject({ kind: "rate_limited" });
  });

  it("throws an invalid_query error on 422", async () => {
    await expect(
      searchRepositories({ query: "__invalid__", page: 1 }),
    ).rejects.toBeInstanceOf(GitHubApiError);
    await expect(
      searchRepositories({ query: "__invalid__", page: 1 }),
    ).rejects.toMatchObject({ kind: "invalid_query", status: 422 });
  });
});

describe("getRepository", () => {
  it("uses subscribers_count as the watcher count (not watchers_count)", async () => {
    const detail = await getRepository({ owner: "facebook", repo: "react" });
    expect(detail.watchers).toBe(6600); // subscribers_count, not 230000
    expect(detail.stars).toBe(230000);
    expect(detail.forks).toBe(47000);
    expect(detail.issues).toBe(900); // open_issues_count (incl. PRs)
  });

  it("throws a not_found error on 404", async () => {
    await expect(
      getRepository({ owner: "facebook", repo: "__missing__" }),
    ).rejects.toMatchObject({ kind: "not_found", status: 404 });
  });
});
