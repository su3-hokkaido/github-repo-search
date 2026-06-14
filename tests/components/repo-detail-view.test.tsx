import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderIntlFlushed } from "../test-utils";
import { RepoDetailView } from "@/components/repo-detail-view";
import { ApiError, fetchRepo } from "@/lib/api-client";
import type { RepoDetail } from "@/lib/github";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, fetchRepo: vi.fn() };
});

const mockFetchRepo = vi.mocked(fetchRepo);

// An already-rejected promise with a no-op handler attached, so the expected
// rejection is not flagged as unhandled before the component consumes it.
function rejectedWith(error: unknown): Promise<never> {
  const promise = Promise.reject(error);
  promise.catch(() => {});
  return promise;
}

const detail: RepoDetail = {
  id: 1,
  name: "react",
  fullName: "facebook/react",
  owner: { login: "facebook", avatarUrl: "https://avatars.example/fb.png" },
  description: "UI library",
  language: "JavaScript",
  stars: 230000,
  watchers: 6600,
  forks: 47000,
  issues: 900,
  htmlUrl: "https://github.com/facebook/react",
};

describe("RepoDetailView", () => {
  it("renders all detail fields on success", async () => {
    mockFetchRepo.mockResolvedValue(detail);
    await renderIntlFlushed(<RepoDetailView owner="facebook" repo="react" />);

    expect(screen.getByRole("heading", { name: "facebook/react" })).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();

    // Star / Watcher / Fork / Issue values (watcher must be subscribers_count).
    expect(screen.getByText("230,000")).toBeInTheDocument();
    expect(screen.getByText("6,600")).toBeInTheDocument();
    expect(screen.getByText("47,000")).toBeInTheDocument();
    expect(screen.getByText("900")).toBeInTheDocument();

    expect(screen.getByAltText("facebook avatar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to search/i })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(mockFetchRepo).toHaveBeenCalledWith(
      "facebook",
      "react",
      expect.any(AbortSignal),
    );
  });

  it("shows a not-found message on 404", async () => {
    mockFetchRepo.mockReturnValue(
      rejectedWith(new ApiError("not_found", 404, "Repository not found.")),
    );
    await renderIntlFlushed(<RepoDetailView owner="facebook" repo="ghost" />);
    expect(screen.getByText(/couldn’t find that repository/i)).toBeInTheDocument();
  });

  it("shows a rate-limit message on 429", async () => {
    mockFetchRepo.mockReturnValue(
      rejectedWith(new ApiError("rate_limited", 429, "Rate limited.")),
    );
    await renderIntlFlushed(<RepoDetailView owner="facebook" repo="react" />);
    expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
  });

  it("shows a generic message on other errors", async () => {
    mockFetchRepo.mockReturnValue(rejectedWith(new Error("boom")));
    await renderIntlFlushed(<RepoDetailView owner="facebook" repo="react" />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
