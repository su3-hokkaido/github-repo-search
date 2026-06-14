import { type ReactElement } from "react";
import { act, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";

type Messages = typeof enMessages;

interface IntlOptions {
  locale?: string;
  messages?: Messages;
}

function withIntl(
  ui: ReactElement,
  { locale = "en", messages = enMessages }: IntlOptions = {},
) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

/** Render a component inside the i18n provider (English messages by default). */
export function renderIntl(ui: ReactElement, options?: IntlOptions) {
  return render(withIntl(ui, options));
}

/** Like renderIntl, but flushes async effects inside act so state updates (and
 *  any already-handled rejection) settle cleanly in the test environment. */
export async function renderIntlFlushed(ui: ReactElement, options?: IntlOptions) {
  await act(async () => {
    render(withIntl(ui, options));
  });
}
