"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/locale";
import { locales } from "@/i18n/config";

/** Language picker. Persists the choice via a server action (cookie), then
 *  refreshes the route so Server Components re-render with the new locale. */
export function LocaleSwitcher() {
  const t = useTranslations("Locale");
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <select
      aria-label={t("label")}
      value={active}
      onChange={onChange}
      disabled={pending}
      className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {t(locale)}
        </option>
      ))}
    </select>
  );
}
