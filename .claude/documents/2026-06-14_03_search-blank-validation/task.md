# Task: Blank keyword validation message on search

- [x] Add `Search.validationRequired` to `messages/en.json`
- [x] Add `Search.validationRequired` to `messages/ja.json`
- [x] Implement validation + message rendering in `components/search-box.tsx`
  - [x] Show message on blank (empty / whitespace-only) submit, no navigation
  - [x] Clear message when the user edits the input
  - [x] Accessibility: `aria-invalid`, `aria-describedby`, `role="alert"`
- [x] Add tests in `tests/components/search-box.test.tsx`
  - [x] Shows the message on a blank submit
  - [x] Does not navigate on a blank submit (existing, kept)
  - [x] Hides the message after typing a valid keyword
- [x] Run `pnpm test` and `pnpm lint`
