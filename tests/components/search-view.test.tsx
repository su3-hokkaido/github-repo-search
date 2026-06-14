import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderIntl } from "../test-utils";
import { SearchView } from "@/components/search-view";
import { ApiError, fetchSearch, type SearchResponse } from "@/lib/api-client";

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
  useRouter: () => ({ push: vi.fn() }),
}));

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
  return { ...actual, fetchSearch: vi.fn() };
});

const mockFetchSearch = vi.mocked(fetchSearch);

const sample: SearchResponse = {
  items: [
    {
      id: 1,
      name: "react",
      fullName: "facebook/react",
      owner: { login: "facebook", avatarUrl: "https://avatars.example/fb.png" },
      description: "UI library",
      language: "JavaScript",
      stars: 230000,
      htmlUrl: "https://github.com/facebook/react",
    },
  ],
  totalCount: 4521,
  page: 1,
  perPage: 100,
  pageCount: 10,
};

function setParams(value: string) {
  useSearchParamsMock.mockReturnValue(new URLSearchParams(value));
}

beforeEach(() => {
  mockFetchSearch.mockReset();
  useSearchParamsMock.mockReset();
});

describe("SearchView", () => {
  it("shows the idle prompt and does not fetch without a query", () => {
    setParams("");
    renderIntl(<SearchView />);
    expect(screen.getByText(/search github repositories by keyword/i)).toBeInTheDocument();
    expect(mockFetchSearch).not.toHaveBeenCalled();
  });

  it("renders results and pagination on success", async () => {
    setParams("q=react&page=1");
    mockFetchSearch.mockResolvedValue(sample);
    renderIntl(<SearchView />);

    expect(await screen.findByText("facebook/react")).toBeInTheDocument();
    expect(screen.getByText(/4,521 repositories found/i)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    expect(mockFetchSearch).toHaveBeenCalledWith("react", 1, expect.any(AbortSignal));
  });

  it("shows an empty-state message when there are no matches", async () => {
    setParams("q=zzzznope&page=1");
    mockFetchSearch.mockResolvedValue({
      ...sample,
      items: [],
      totalCount: 0,
      pageCount: 0,
    });
    renderIntl(<SearchView />);
    expect(await screen.findByText(/no repositories match/i)).toBeInTheDocument();
  });

  it("shows a rate-limit message on 429", async () => {
    setParams("q=react&page=1");
    mockFetchSearch.mockRejectedValue(
      new ApiError("rate_limited", 429, "Rate limit exceeded."),
    );
    renderIntl(<SearchView />);
    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument();
  });

  it("shows a generic message on other errors", async () => {
    setParams("q=react&page=1");
    mockFetchSearch.mockRejectedValue(new Error("boom"));
    renderIntl(<SearchView />);
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });
});
