"use client";

import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { RepoListItem } from "@/lib/github";

interface RepoListProps {
  items: RepoListItem[];
}

/** Renders search results. Each row links to the repository's detail page. */
export function RepoList({ items }: RepoListProps) {
  const t = useTranslations("RepoList");
  const format = useFormatter();

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/repos/${item.owner.login}/${item.name}`}
            className="flex items-center gap-3 rounded-md border border-neutral-200 p-3 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <Image
              src={item.owner.avatarUrl}
              alt={`${item.owner.login} avatar`}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                {item.fullName}
              </p>
              {item.description ? (
                <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              {item.language ? <span>{item.language}</span> : null}
              <span aria-label={t("starsLabel", { count: item.stars })}>
                ★ {format.number(item.stars)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
