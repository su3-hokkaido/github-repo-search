// Browser-side client for the app's own BFF endpoints (/api/*).
//
// The browser only ever talks to these endpoints — never to the GitHub API
// directly — so the token, caching, and rate limiting stay server-side.

import type { RepoDetail, RepoListItem } from "./github";

export interface SearchResponse {
  items: RepoListItem[];
  totalCount: number;
  page: number;
  perPage: number;
  pageCount: number;
}

export type ApiErrorKind = "rate_limited" | "not_found" | "bad_request" | "server";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;

  constructor(kind: ApiErrorKind, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 429) return "rate_limited";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "bad_request";
  return "server";
}

async function readError(response: Response): Promise<ApiError> {
  let message = `Request failed (status ${response.status}).`;
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) message = data.error;
  } catch {
    // Ignore non-JSON error bodies.
  }
  return new ApiError(kindForStatus(response.status), response.status, message);
}

export async function fetchSearch(
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  const response = await fetch(`/api/search?${params.toString()}`, { signal });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as SearchResponse;
}

export async function fetchRepo(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<RepoDetail> {
  const response = await fetch(
    `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { signal },
  );
  if (!response.ok) throw await readError(response);
  return (await response.json()) as RepoDetail;
}
