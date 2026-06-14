import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";

/** Global header: app title (links home) plus language and theme controls. */
export async function SiteHeader() {
  const t = await getTranslations("Common");

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 p-4">
        <Link
          href="/search"
          className="font-semibold text-neutral-900 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-neutral-100"
        >
          {t("appTitle")}
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
