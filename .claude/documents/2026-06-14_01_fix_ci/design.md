# CI Workflow Design (GitHub Actions)

## Goal

Run the existing automated test suite on every push and pull request so that
regressions are caught before code reaches `main`. The pipeline mirrors the
local commands defined in `project_plan.md`:

```bash
pnpm lint
pnpm typecheck
pnpm test   # Vitest unit + integration (MSW)
pnpm e2e    # Playwright
```

## Scope

- Add a single workflow file: `.github/workflows/ci.yml`.
- No application code changes. Only CI configuration.
- The existing `create-d2m-pr.yml` workflow is unrelated and left untouched.

## Triggers

- `pull_request` targeting `main` and `develop` (the integration branches).
- `push` to `main` and `develop` so the default branches always have a green
  signal.
- `workflow_dispatch` for manual runs while iterating on the pipeline.

`concurrency` cancels superseded runs on the same ref to save CI minutes.

## Jobs

All jobs run on `ubuntu-latest`, share the same setup, and run in parallel so
feedback is fast. Each job is independent (separate checkout + install) which
keeps the graph simple and lets a single failing check be re-run in isolation.

| Job        | Command          | Notes                                            |
| ---------- | ---------------- | ------------------------------------------------ |
| `lint`     | `pnpm lint`      | ESLint (`eslint .`).                             |
| `typecheck`| `pnpm typecheck` | `tsc --noEmit`.                                  |
| `test`     | `pnpm test`      | Vitest run; GitHub API is mocked with MSW.       |
| `e2e`      | `pnpm e2e`       | Playwright (Chromium). Starts `pnpm dev` itself. |

### Shared setup steps

1. `actions/checkout@v6`.
2. `pnpm/action-setup@v6` — pnpm version is read from the `packageManager`
   field in `package.json` (pinned to `pnpm@9.12.0`).
3. `actions/setup-node@v4` with `node-version: 20` (the project requires
   `>=20.9.0`) and `cache: pnpm` for dependency caching.
4. `pnpm install --frozen-lockfile` — fails if `pnpm-lock.yaml` is out of date,
   guaranteeing reproducible installs.

### E2E specifics

- Playwright's `webServer` config starts `pnpm dev` automatically and waits for
  `http://localhost:3000`. `reuseExistingServer` is disabled when `CI` is set
  (GitHub Actions sets `CI=true`), so a fresh server is always used.
- Browsers are installed with `pnpm exec playwright install --with-deps chromium`
  (only Chromium is configured in `playwright.config.ts`).
- The Playwright HTML report is uploaded as an artifact for debugging.

## Secrets / environment

No secrets are required. Both the Vitest suite and the Playwright suite are
fully self-contained:

- Vitest mocks the GitHub API via MSW (`tests/mocks/*`).
- Playwright intercepts the app's own `/api/*` routes at the browser level, so
  no `GITHUB_TOKEN` and no network access are needed.

This keeps CI deterministic and avoids hitting GitHub's rate-limited API.

## Out of scope

- Deployment to Cloudflare Workers (handled separately).
- Coverage gating in CI (thresholds already enforced locally via Vitest config;
  can be added later if desired).
