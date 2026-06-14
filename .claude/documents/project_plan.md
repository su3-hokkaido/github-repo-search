## Project

A GitHub repository search web app. Users type a keyword, see a paginated list
of repositories, and open a **dedicated detail page** (not a modal) for a
selected repository. Audience: engineers. Goal: a production-minded portfolio /
screening deliverable that is fully free to host.

## Tech stack (fixed)

- **Next.js 16+ (App Router)**, TypeScript. Use **>= 16.2.6** (security fixes).
- Backend logic lives in **Next.js Route Handlers** (`app/api/*`) acting as a
  BFF. There is **no separate backend service**.
- Hosting: **Cloudflare Workers** via the OpenNext adapter
  (`@opennextjs/cloudflare`). Config is in `wrangler.jsonc`.
- UI: **shadcn/ui** (optional but preferred), Tailwind.
- i18n: **next-intl** (ja / en). Theme: **next-themes** (dark / light).
- Rate-limit / cache store: **Cloudflare KV** (preferred) or **Upstash Redis**.

## Hard rules (do not violate)

1. **Never expose the GitHub token to the client.** `GITHUB_TOKEN` is read only
   inside Route Handlers (server side). It is a Cloudflare secret, never
   committed and never sent to the browser.
2. **The browser must never call the GitHub API directly.** All GitHub traffic
   goes through our own Route Handlers so we can centralize token handling,
   caching, and rate limiting.
3. **Never implement rate limiting with in-memory state.** Workers isolates are
   not sticky, so counters must live in an external store (KV / Durable Object /
   Upstash). In-memory caches are only allowed as an optional ephemeral
   optimization layered on top of the external store.
4. **Tests must mock the GitHub API** (MSW). Do not hit the real API in tests —
   it is rate limited and makes tests flaky.
5. **Detail view is a page, not a modal** (`/repos/[owner]/[repo]`). This is a
   task requirement.

## Domain gotchas (get these right)

- **Watcher count**: GitHub's `watchers_count` is, for historical reasons, equal
  to the star count. The real watcher (subscriber) count is **`subscribers_count`**.
  Use `subscribers_count` for the displayed "Watchers" value.
- **Issue count**: `open_issues_count` includes **open issues AND open pull
  requests**. Note this in the UI/README rather than presenting it as pure issues.
- **Search result cap**: the GitHub search API returns at most the **first 1000
  results**. With `per_page=100`, that is at most **10 pages**. Compute page
  count as `min(ceil(total_count / 100), 10)`.
- **Upstream errors**: handle `403` / `429` (rate limited) and empty results as
  distinct, user-facing states.

## Routing & state

- Routes: `/`, `/search`, `/repos/[owner]/[repo]`, plus `app/api/search` and
  `app/api/repos/[owner]/[repo]`.
- Keep search state (`q`, `page`) in the **URL query string** so reload, share,
  and browser back/forward all work.
- Pagination: 100 items per page, **no infinite scroll**. Pager shows a **window
  of 5 pages** and always allows jumping to the **first and last** page.

## Commands

Run these after any change; all must pass before a commit is considered done:

```bash
pnpm lint
pnpm typecheck
pnpm test          # Vitest unit + integration (MSW)
pnpm e2e           # Playwright (when relevant to the change)
```

Local preview against the Workers runtime:

```bash
npx opennextjs-cloudflare build && npx wrangler dev
```

## Workflow & commits

- Work in **phases**; each phase is one focused, reviewable commit.
- A commit is only complete when lint, typecheck, and the relevant tests are
  green.
- Write clear commit messages describing the "why", not just the "what".

## Conventions

- **All code comments and documentation are written in English.**
- Prefer small, pure, unit-testable functions for logic (pagination math, query
  shaping, rate-limit decisions, GitHub response mapping).
- Validate and bound user input (`q`): length limit and allowed characters.
- Route Handlers return only the fields the UI needs (shape/normalize upstream
  responses); never proxy raw GitHub payloads wholesale.
- Add security headers (CSP, X-Content-Type-Options, etc.) via middleware /
  `next.config`.

## Definition of done (per task requirements)

- Keyword search → list → detail page works end to end.
- Detail shows: name, owner avatar, language, stars, watchers, forks, issues.
- Dark/light and ja/en toggles persist across reloads.
- Rate limiting returns `429` with `Retry-After` / `X-RateLimit-*` headers.
- Tests exist for logic, API handlers (mocked), components, and key e2e flows.
- README documents design decisions, trade-offs, and an **AI usage report**.
