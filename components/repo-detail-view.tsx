"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ApiError, fetchRepo } from "@/lib/api-client";
import type { RepoDetail } from "@/lib/github";

type ViewState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error"; error: ApiError | Error }
  | { status: "success"; data: RepoDetail };

function Stat({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="flex flex-col">
      <dt
        className="text-sm text-neutral-600 dark:text-neutral-400"
        title={title}
      >
        {label}
      </dt>
      <dd className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </dd>
    </div>
  );
}

interface RepoDetailViewProps {
  owner: string;
  repo: string;
}

/** Repository detail page body. Fetches via the BFF and renders the repo's
 *  name, owner avatar, language, and star / watcher / fork / issue counts. */
export function RepoDetailView({ owner, repo }: RepoDetailViewProps) {
  const t = useTranslations("RepoDetail");
  const format = useFormatter();
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ status: "loading" });

    (async () => {
      try {
        const data = await fetchRepo(owner, repo, controller.signal);
        if (active) setState({ status: "success", data });
      } catch (error: unknown) {
        if (!active) return;
        if (error instanceof Error && error.name === "AbortError") return;
        if (error instanceof ApiError && error.kind === "not_found") {
          setState({ status: "not_found" });
          return;
        }
        setState({ status: "error", error: error as Error });
      }
    })().catch(() => {
      // The body already handles errors; this guards against any unexpected
      // escape so a rejection can never surface as an unhandled promise.
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [owner, repo]);

  const isRateLimited =
    state.status === "error" &&
    state.error instanceof ApiError &&
    state.error.kind === "rate_limited";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <Link
        href="/search"
        className="self-start text-sm text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400"
      >
        ← {t("back")}
      </Link>

      <div aria-live="polite">
        {state.status === "loading" ? (
          <p className="text-neutral-600 dark:text-neutral-400">{t("loading")}</p>
        ) : null}

        {state.status === "not_found" ? (
          <p role="alert" className="text-neutral-700 dark:text-neutral-300">
            {t("notFound")}
          </p>
        ) : null}

        {state.status === "error" ? (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {isRateLimited ? t("errorRateLimited") : t("errorGeneric")}
          </p>
        ) : null}

        {state.status === "success" ? (
          <article className="flex flex-col gap-6">
            <header className="flex items-center gap-4">
              <Image
                src={state.data.owner.avatarUrl}
                alt={`${state.data.owner.login} avatar`}
                width={64}
                height={64}
                className="rounded-full"
              />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {state.data.fullName}
                </h1>
                {state.data.language ? (
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {state.data.language}
                  </p>
                ) : null}
              </div>
            </header>

            {state.data.description ? (
              <p className="text-neutral-700 dark:text-neutral-300">
                {state.data.description}
              </p>
            ) : null}

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label={t("stars")} value={format.number(state.data.stars)} />
              <Stat
                label={t("watchers")}
                value={format.number(state.data.watchers)}
                title={t("watchersTitle")}
              />
              <Stat label={t("forks")} value={format.number(state.data.forks)} />
              <Stat
                label={t("issues")}
                value={format.number(state.data.issues)}
                title={t("issuesTitle")}
              />
            </dl>

            <a
              href={state.data.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {t("openOnGitHub")} ↗
            </a>
          </article>
        ) : null}
      </div>
    </div>
  );
}
