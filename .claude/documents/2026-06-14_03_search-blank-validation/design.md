# Design: Blank keyword validation message on search

## Background / Problem

When the keyword input is empty or contains only whitespace, clicking the
search button does nothing and shows no feedback. `SearchBox.submit` trims the
value and silently `return`s when it is empty, so the user gets no indication of
why nothing happened.

## Goal

When the user clicks search with a blank keyword (empty or whitespace-only),
display a validation message prompting them to enter a keyword. No navigation
should occur.

## Approach

Handle the validation inside `components/search-box.tsx`, because a blank
submit never navigates and therefore never reaches `SearchView`'s URL-driven
state. Keeping it local also keeps the message tied to the input it concerns.

### Behavior

- On submit, trim the value.
  - If empty: show the validation message and do not navigate.
  - Otherwise: clear any message and navigate to `/search?q=...&page=1`.
- Clear the message as soon as the user edits the input again.

### Accessibility

- The input gets `aria-invalid` and, when invalid, `aria-describedby` pointing
  to the message element.
- The message element uses `role="alert"` so screen readers announce it.

### i18n

Add a new key `Search.validationRequired` to both `messages/en.json` and
`messages/ja.json`.

- en: "Enter a keyword to search."
- ja: "検索キーワードを入力してください。"

## Out of scope

- Server-side validation (the API already returns 400 for a missing `q`).
- Changes to `SearchView` idle/loading/empty handling.
