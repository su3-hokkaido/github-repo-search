"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface SearchBoxProps {
  initialQuery?: string;
}

/** Keyword input. Submitting navigates to /search?q=...&page=1 so search state
 *  lives in the URL (shareable, reloadable, back/forward friendly). */
export function SearchBox({ initialQuery = "" }: SearchBoxProps) {
  const t = useTranslations("Search");
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [error, setError] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    // キーワードが空白（スペースのみ含む）の場合は遷移せず、メッセージを表示する。
    if (!query) {
      setError(true);
      return;
    }
    setError(false);
    router.push(`/search?q=${encodeURIComponent(query)}&page=1`);
  }

  return (
    <form onSubmit={submit} role="search" className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label htmlFor="repo-search" className="sr-only">
          {t("inputLabel")}
        </label>
        <input
          id="repo-search"
          type="text"
          name="q"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            // 入力が再開されたらメッセージを消す。
            if (error) setError(false);
          }}
          placeholder={t("placeholder")}
          autoComplete="off"
          aria-invalid={error}
          aria-describedby={error ? "repo-search-error" : undefined}
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {t("submit")}
        </button>
      </div>
      {error ? (
        <p
          id="repo-search-error"
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {t("validationRequired")}
        </p>
      ) : null}
    </form>
  );
}
