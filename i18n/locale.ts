"use server";

import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookie, type Locale } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Persists the user's locale choice. The active locale is read back from this
 *  cookie in i18n/request.ts on the next request. */
export async function setLocale(value: string): Promise<void> {
  const locale: Locale = isLocale(value) ? value : defaultLocale;
  const store = await cookies();
  store.set(localeCookie, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
