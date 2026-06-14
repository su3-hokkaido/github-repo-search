// MSW handlers that mock the GitHub API, including error cases. Tests trigger
// specific behaviors via sentinel query/path values.

import { http, HttpResponse } from "msw";
import { rawRepoDetail, rawSearchResponse } from "./fixtures";

export const handlers = [
  // Repository search.
  http.get("https://api.github.com/search/repositories", ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";

    if (q === "__invalid__") {
      return HttpResponse.json(
        { message: "Validation Failed" },
        { status: 422 },
      );
    }
    if (q === "__ratelimit__") {
      return HttpResponse.json(
        { message: "API rate limit exceeded" },
        {
          status: 403,
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(Math.ceil(Date.now() / 1000) + 30),
          },
        },
      );
    }
    if (q === "__empty__") {
      return HttpResponse.json({
        total_count: 0,
        incomplete_results: false,
        items: [],
      });
    }
    return HttpResponse.json(rawSearchResponse);
  }),

  // Single repository.
  http.get(
    "https://api.github.com/repos/:owner/:repo",
    ({ params }) => {
      if (params.repo === "__missing__") {
        return HttpResponse.json({ message: "Not Found" }, { status: 404 });
      }
      return HttpResponse.json(rawRepoDetail);
    },
  ),
];
