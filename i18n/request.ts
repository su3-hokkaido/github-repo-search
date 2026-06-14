import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, localeCookie, type Locale } from "./config";

// No locale-based routing: we keep clean URLs and resolve the active locale from
// a cookie. Returning `locale` explicitly is required in this setup.
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(localeCookie)?.value;
  const locale: Locale = isLocale(cookieValue) ? cookieValue : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
