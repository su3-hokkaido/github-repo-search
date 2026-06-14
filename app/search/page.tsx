import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SearchView } from "@/components/search-view";

// useSearchParams() suspends, so the client view must sit under a Suspense
// boundary.
export default async function SearchPage() {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<div className="p-4">{t("loading")}</div>}>
      <SearchView />
    </Suspense>
  );
}
