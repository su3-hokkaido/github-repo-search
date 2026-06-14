"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { getPageWindow } from "@/lib/pagination";

interface PaginationProps {
  query: string;
  currentPage: number;
  pageCount: number;
}

function hrefFor(query: string, page: number): string {
  return `/search?q=${encodeURIComponent(query)}&page=${page}`;
}

const linkClass =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-neutral-200 px-3 text-sm hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:hover:bg-neutral-900";

const currentClass =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white";

const ellipsisClass = "inline-flex h-9 items-center px-1 text-neutral-500";

/** Pager: shows a window of 5 pages, plus jumps to the first/last page. Renders
 *  nothing for single-page results. */
export function Pagination({ query, currentPage, pageCount }: PaginationProps) {
  const t = useTranslations("Pagination");
  const window = getPageWindow(currentPage, pageCount);
  if (window.pageCount <= 1) return null;

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center gap-1">
      {window.hasPrev ? (
        <Link
          href={hrefFor(query, window.current - 1)}
          className={linkClass}
          aria-label={t("previous")}
        >
          ‹
        </Link>
      ) : null}

      {window.showFirst ? (
        <>
          <Link
            href={hrefFor(query, 1)}
            className={linkClass}
            aria-label={t("page", { page: 1 })}
          >
            1
          </Link>
          <span className={ellipsisClass} aria-hidden="true">
            …
          </span>
        </>
      ) : null}

      {window.pages.map((page) =>
        page === window.current ? (
          <span key={page} aria-current="page" className={currentClass}>
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(query, page)}
            className={linkClass}
            aria-label={t("page", { page })}
          >
            {page}
          </Link>
        ),
      )}

      {window.showLast ? (
        <>
          <span className={ellipsisClass} aria-hidden="true">
            …
          </span>
          <Link
            href={hrefFor(query, window.pageCount)}
            className={linkClass}
            aria-label={t("page", { page: window.pageCount })}
          >
            {window.pageCount}
          </Link>
        </>
      ) : null}

      {window.hasNext ? (
        <Link
          href={hrefFor(query, window.current + 1)}
          className={linkClass}
          aria-label={t("next")}
        >
          ›
        </Link>
      ) : null}
    </nav>
  );
}
