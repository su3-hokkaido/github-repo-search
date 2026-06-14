"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Wraps the app with next-themes. Uses the `class` strategy (adds `dark` on
 *  <html>) so Tailwind's `dark:` variants apply, follows the system preference
 *  by default, and persists the user's choice in localStorage. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
