// GitHub API client and domain mapping.
//
// This module is intentionally free of Next.js / Cloudflare imports so it can be
// unit-tested in isolation (the only external dependency is the global `fetch`,
// which is mocked with MSW in tests).

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const GITHUB_API_BASE = "https://api.github.com";

/** GitHub's search API returns at most 100 items per page. */
export const PER_PAGE = 100;

/** GitHub's search API only exposes the first 1000 results. */
export const MAX_RESULT_WINDOW = 1000;

/** With 100 items/page and a 1000-result window, at most 10 pages are reachable. */
export const MAX_PAGES = MAX_RESULT_WINDOW / PER_PAGE; // 10

// ----------------------------------------------------------------------------
// Public (shaped) response types — only the fields the UI needs.
// ----------------------------------------------------------------------------

export interface RepoOwner {
  login: string;
  avatarUrl: string;
}

export interface RepoListItem {
  id: number;
  name: string;
  fullName: string; // "owner/repo"
  owner: RepoOwner;
  description: string | null;
  language: string | null;
  stars: number; // stargazers_count
  htmlUrl: string;
}

export interface RepoDetail extends RepoListItem {
  /**
   * Real watcher (subscriber) count. NOTE: GitHub's `watchers_count` field is,
   * for historical reasons, equal to the star count, so we use
   * `subscribers_count` here instead.
   */
  watchers: number;
  forks: number; // forks_count
  /**
   * `open_issues_count`. WARNING: this includes BOTH open issues AND open pull
   * requests. Surfaced as "Issues" in the UI; documented here and in the README.
   */
  issues: number;
}

export interface SearchResult {
  items: RepoListItem[];
  totalCount: number; // raw GitHub total_count (may exceed MAX_RESULT_WINDOW)
}

// ----------------------------------------------------------------------------
// Raw GitHub response types (subset of fields actually consumed).
// ----------------------------------------------------------------------------

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  subscribers_count?: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
}

interface RawSearchResponse {
  total_count: number;
  items: RawRepo[];
}

// ----------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------

export type GitHubErrorKind =
  | "rate_limited"
  | "not_found"
  | "invalid_query"
  | "upstream";

/** Normalized error so route handlers can map upstream failures to HTTP responses. */
export class GitHubApiError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(
    kind: GitHubErrorKind,
    status: number,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
    this.kind = kind;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ----------------------------------------------------------------------------
// Pagination helpers
// ----------------------------------------------------------------------------

/** Number of selectable pages, capped by GitHub's 1000-result window. */
export function computePageCount(totalCount: number): number {
  if (!Number.isFinite(totalCount) || totalCount <= 0) return 0;
  const capped = Math.min(totalCount, MAX_RESULT_WINDOW);
  return Math.min(Math.ceil(capped / PER_PAGE), MAX_PAGES);
}

/** Clamp a requested page to [1, MAX_PAGES] so we never trigger a 422 from GitHub. */
export function clampPage(page: number): number {
  if (!Number.isFinite(page)) return 1;
  const truncated = Math.trunc(page);
  if (truncated < 1) return 1;
  return Math.min(truncated, MAX_PAGES);
}

// ----------------------------------------------------------------------------
// Mapping
// ----------------------------------------------------------------------------

function mapListItem(raw: RawRepo): RepoListItem {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    owner: { login: raw.owner.login, avatarUrl: raw.owner.avatar_url },
    description: raw.description,
    language: raw.language,
    stars: raw.stargazers_count,
    htmlUrl: raw.html_url,
  };
}

function mapDetail(raw: RawRepo): RepoDetail {
  return {
    ...mapListItem(raw),
    // Fall back to stargazers_count only if subscribers_count is absent (it is
    // present on the single-repo endpoint but not always on search items).
    watchers: raw.subscribers_count ?? raw.stargazers_count,
    forks: raw.forks_count,
    issues: raw.open_issues_count,
  };
}

// ----------------------------------------------------------------------------
// HTTP
// ----------------------------------------------------------------------------

interface RequestOptions {
  token?: string;
  signal?: AbortSignal;
}

async function githubFetch(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub requires a User-Agent on API requests.
    "User-Agent": "github-repo-search-app",
  };
  // A token raises the rate limit and is read only on the server.
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  return fetch(`${GITHUB_API_BASE}${path}`, {
    headers,
    signal: options.signal,
  });
}

function parseRetryAfter(response: Response): number | undefined {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds);
  }
  // Fall back to the rate-limit reset timestamp (epoch seconds).
  const reset = response.headers.get("x-ratelimit-reset");
  if (reset) {
    const resetEpoch = Number(reset);
    if (Number.isFinite(resetEpoch)) {
      return Math.max(0, Math.ceil(resetEpoch - Date.now() / 1000));
    }
  }
  return undefined;
}

function toApiError(response: Response): GitHubApiError {
  const retryAfter = parseRetryAfter(response);

  if (response.status === 429) {
    return new GitHubApiError(
      "rate_limited",
      429,
      "GitHub rate limit exceeded.",
      retryAfter,
    );
  }
  // Primary rate limit is reported as 403 with x-ratelimit-remaining: 0.
  if (
    response.status === 403 &&
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    return new GitHubApiError(
      "rate_limited",
      403,
      "GitHub rate limit exceeded.",
      retryAfter,
    );
  }
  if (response.status === 422) {
    return new GitHubApiError("invalid_query", 422, "Invalid search query.");
  }
  if (response.status === 404) {
    return new GitHubApiError("not_found", 404, "Repository not found.");
  }
  return new GitHubApiError(
    "upstream",
    response.status,
    `GitHub API error (status ${response.status}).`,
  );
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/** Search public repositories. `page` is clamped to GitHub's reachable window. */
export async function searchRepositories(args: {
  query: string;
  page: number;
  token?: string;
  signal?: AbortSignal;
}): Promise<SearchResult> {
  const page = clampPage(args.page);
  const params = new URLSearchParams({
    q: args.query,
    per_page: String(PER_PAGE),
    page: String(page),
  });

  const response = await githubFetch(
    `/search/repositories?${params.toString()}`,
    { token: args.token, signal: args.signal },
  );
  if (!response.ok) throw toApiError(response);

  const data = (await response.json()) as RawSearchResponse;
  return {
    items: data.items.map(mapListItem),
    totalCount: data.total_count,
  };
}

/** Fetch a single repository's details. */
export async function getRepository(args: {
  owner: string;
  repo: string;
  token?: string;
  signal?: AbortSignal;
}): Promise<RepoDetail> {
  const owner = encodeURIComponent(args.owner);
  const repo = encodeURIComponent(args.repo);

  const response = await githubFetch(`/repos/${owner}/${repo}`, {
    token: args.token,
    signal: args.signal,
  });
  if (!response.ok) throw toApiError(response);

  const data = (await response.json()) as RawRepo;
  return mapDetail(data);
}
