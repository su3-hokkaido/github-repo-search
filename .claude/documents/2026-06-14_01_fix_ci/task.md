# CI Workflow Tasks

## Checklist

- [x] Review existing test setup (`tests/`, `e2e/`, Vitest/Playwright configs).
- [x] Document design in `design.md`.
- [x] Create `.github/workflows/ci.yml` with `lint`, `typecheck`, `test`, `e2e`
      jobs.
- [x] Configure shared setup (checkout, pnpm, Node 20, frozen install).
- [x] Configure Playwright browser install + report artifact upload.
- [x] Run the four checks locally to validate the workflow steps.
- [ ] Confirm workflow runs green on GitHub (requires push by the user).

## Local validation results (2026-06-14)

The CI workflow is implemented and its commands are correct, but running the
four checks locally currently FAILS. These failures are pre-existing issues in
the application code/config (work in progress in a parallel session), not
problems with the CI configuration:

- `pnpm lint`: ESLint crashes — `Converting circular structure to JSON` from
  `@eslint/eslintrc` `FlatCompat` while loading `next/core-web-vitals`. This is
  an ESLint flat-config / `eslint-config-next` compatibility issue in
  `eslint.config.mjs`.
- `pnpm typecheck`: `tsc` errors in `tests/api/*` — `GET(...)` route handlers
  now expect 2 arguments but the tests call them with 1 (the route handler
  signatures changed; the tests have not been updated).
- `pnpm test`: 8 Vitest failures (3 files) tied to the same handler-signature
  drift and a `500` returned where `400` is expected for an invalid query.
- `pnpm e2e`: not run because the upstream checks fail first; the workflow step
  itself is correctly configured.

Action: these belong to the application development stream. Once those are
fixed there, the CI workflow will go green unchanged.

## Notes

- No secrets needed; tests are fully mocked (MSW + Playwright route
  interception).
- Branch for this work: `feature/ci-github-actions` (to be created by the user;
  git operations are performed by the user, not the assistant).
- Do not commit; ask the user to review and create the PR.
