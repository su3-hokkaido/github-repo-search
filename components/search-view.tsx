"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, fetchSearch, type SearchResponse } from "@/lib/api-client";
import { SearchBox } from "./search-box";
import { RepoList } from "./repo-list";
import { Pagination } from "./pagination";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: ApiError | Error }
  | { status: "success"; data: SearchResponse };

/** Search page body. Reads q/page from the URL, fetches via the BFF, and renders
 *  idle / loading / empty / error / results states. */
export function SearchView() {
  const t = useTranslations("Search");
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const [state, setState] = useState<ViewState>({ status: "idle" });

  useEffect(() => {
    if (!query) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    fetchSearch(query, page, controller.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({ status: "error", error: error as Error });
      });

    return () => controller.abort();
  }, [query, page]);

  const isRateLimited =
    state.status === "error" &&
    state.error instanceof ApiError &&
    state.error.kind === "rate_limited";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <SearchBox initialQuery={query} />

      <div aria-live="polite" className="flex flex-col gap-4">
        {state.status === "idle" ? (
          <p className="text-neutral-600 dark:text-neutral-400">{t("idle")}</p>
        ) : null}

        {state.status === "loading" ? (
          <p className="text-neutral-600 dark:text-neutral-400">{t("loading")}</p>
        ) : null}

        {state.status === "error" ? (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {isRateLimited ? t("errorRateLimited") : t("errorGeneric")}
          </p>
        ) : null}

        {state.status === "success" && state.data.items.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400">
            {t("empty", { query })}
          </p>
        ) : null}

        {state.status === "success" && state.data.items.length > 0 ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t("resultsSummary", {
                count: state.data.totalCount,
                page: state.data.page,
                pageCount: state.data.pageCount,
              })}
            </p>
            <RepoList items={state.data.items} />
            <Pagination
              query={query}
              currentPage={state.data.page}
              pageCount={state.data.pageCount}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
