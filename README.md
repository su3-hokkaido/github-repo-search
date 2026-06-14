# GitHub Repository Search

A web application that searches GitHub repositories by keyword and displays a list of results along with the details of each repository.
It is built with **Next.js 16 (App Router)** and designed for free deployment to **Cloudflare Workers** (via the OpenNext adapter).

The detail view is implemented as a **dedicated page** rather than a modal, and the project is built out to production-grade standards, including test code and operational concerns (credential isolation, rate limiting, caching, and edge protection).

---

## 0. URLs

| Environment | URL | Note
|---|---|---|
| Production | https://github-repo-search.su3-hokkaido-2210.workers.dev/search | You should publish the specific version by yourselves after you check the preview app.
| Develop | https://develop-github-repo-search.su3-hokkaido-2210.workers.dev/search | N/A

You should execute `npx wrangler versions deploy` via your terminal to publish the specific version on the production after the deployment is succeeded on Cloudflare.

## 1. Meeting the Minimum Requirements

| Requirement | Implementation | Key Files |
|---|---|---|
| Keyword input | Search form (state held in the URL) | `components/search-box.tsx` |
| Search via `search/repositories` and list results | Search through the BFF, list + paginator | `app/api/search/route.ts`, `components/search-view.tsx`, `components/repo-list.tsx` |
| Detail (repo name, owner avatar, language, Star/Watcher/Fork/Issue counts) | Detail view | `components/repo-detail-view.tsx` |
| Detail as a **page, not a modal** | `/repos/[owner]/[repo]` route | `app/repos/[owner]/[repo]/page.tsx` |
| Test code | Vitest + RTL + MSW (69 tests) / Playwright (4 E2E tests) | `tests/**`, `e2e/**` |
| Next.js v16+ / App Router | Next.js `^16.2.6`, App Router | `package.json`, `app/**` |

---

## 2. Tech Stack

- **Next.js 16 (App Router)** — UI + Route Handlers (BFF)
- **React 19 / TypeScript (strict)**
- **next-intl v4** — internationalization (ja / en, Cookie-based, clean URLs)
- **next-themes** — dark / light (follows system preference, avoids FOUC)
- **Cloudflare Workers + OpenNext (@opennextjs/cloudflare)** — hosting, KV (rate limiting / caching)
- **Testing**: Vitest / React Testing Library / MSW / Playwright, coverage (v8)
- **CI/CD**: GitHub Actions (lint / typecheck / test / e2e / deploy)

> Since a component library (such as shadcn/ui) is optional, initialization is **delegated to `shadcn init` on the environment side** to avoid version drift (see §8, Known Limitations).

---

## 3. Architecture

```
Browser ──(only calls its own /api)──▶ Next.js Route Handlers (BFF) ──▶ GitHub API
                                         │  - GITHUB_TOKEN is used only here
                                         │  - Short-TTL cache (KV)
                                         │  - Per-IP rate limiting (KV)
                                         ▼
                                  Cloudflare edge (DDoS / rate limiting / Bot / Under Attack)
```

**Why pure Next.js (no separate backend)**
A server-side proxy (BFF) is mandatory so that the GitHub token is never exposed to the browser. By using Next.js Route Handlers directly as the BFF, token isolation, caching, and rate limiting can all be consolidated in one place without adding more moving parts. Because the browser never calls GitHub directly and only hits **its own `/api/*`**, rate limiting also gains the advantage of being able to see the real client IP.

---

## 4. Highlights & Points of Emphasis

### 4.1 Reflecting GitHub API domain pitfalls in the requirements
- **Watcher count uses `subscribers_count`.** The `watchers_count` returned by `search/repositories` is in practice equal to the Star count, so it is mapped to `subscribers_count`, the true number of watchers.
- **The Issue count (`open_issues_count`) includes Pull Requests.** To avoid confusion, the "Issues" field on the detail screen is annotated to indicate it covers "open Issues and Pull Requests."
- **Search results are capped at the first 1,000 items** per GitHub's constraints, so the page count is rounded to `min(ceil(total / 100), 10)` (`per_page` maxes out at 100).

### 4.2 Credential isolation and multi-layered rate limiting
- `GITHUB_TOKEN` is used only within Route Handlers and is never exposed to the browser.
- Rate limiting is **two-tiered**: the Cloudflare edge (coarse per-IP network limiting + challenges) and a precise application layer (sliding window of 30 req/min for `/api/search` and 60 req/min for `/api/repos`). Since Worker isolates are not sticky, **in-memory rate limiting is not viable**, so a shared store (KV) is used.

### 4.3 Caching
Formatted GitHub responses are cached with a short TTL (KV in production, in-memory in tests). This prevents repeated identical requests from consuming GitHub's rate limit.

### 4.4 A paginator that keeps search state in the URL
- The paginator uses a **5-page window plus jumps to the first / last page**, designed to remain easy to operate even with many results.
- The search keyword and page number are held in URL query params, making them **shareable, reload-resistant, and back/forward compatible** (explicit paging is used instead of infinite scroll).

### 4.5 Internationalization and theming
- ja / en switching via **next-intl (Cookie-based, no URL routing)**. URLs stay clean while all copy is externalized into messages (numbers are localized via ICU).
- system-following + manual switching via **next-themes (class strategy)**. `<html suppressHydrationWarning>` plus a pre-mount placeholder **avoid FOUC and hydration mismatches**.

### 4.6 Accessibility & usability
`role="search"`, `aria-live` (status announcements), `aria-current="page"` (current page), `sr-only` labels, and keyboard focus rings are all applied. Empty-state and error messages are worded so it's clear "what to do next."

### 4.7 Production readiness
- Security headers (`X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy`) are applied to all responses. CSP is provided as a commented-out template for dev-server compatibility, with the plan to enable it in production starting from Report-Only (§9 / `DEPLOY.md`).
- A multi-layered defense that fits entirely within Cloudflare's free tier (always-on DDoS, Bot Fight Mode, Under Attack, rate-limiting rules) is documented step-by-step in `DEPLOY.md`.

### 4.8 Testing and phase-driven development
Implemented in phases (foundation → BFF → rate limiting → search UI → detail → i18n/theme → test finalization → deployment → documentation), **keeping tests green at every stage**. The GitHub API is always mocked with MSW; the real API is never called (to avoid instability from rate limits).

---

## 5. Directory Structure (excerpt)

```
app/
  api/search/route.ts                 # Search proxy (BFF)
  api/repos/[owner]/[repo]/route.ts   # Detail proxy (BFF)
  search/page.tsx                     # Search + list + paginator
  repos/[owner]/[repo]/page.tsx       # Detail (page)
  layout.tsx                          # i18n / theme providers, shared header
components/                            # SearchBox / RepoList / Pagination / RepoDetailView / switchers
lib/
  github.ts                           # GitHub client, types, page calculation, error categories
  pagination.ts                       # 5-page window logic
  rate-limit.ts                       # Sliding window, IP detection
  cache.ts / http.ts / api-client.ts / server-context.ts
i18n/                                 # next-intl config, Cookie locale Server Action
messages/{en,ja}.json                 # Translations
tests/                                # Unit / API / component / i18n
e2e/                                  # Playwright (search→detail, language/theme switching)
.github/workflows/ci.yml              # lint / typecheck / test / e2e / deploy
DEPLOY.md                             # Deployment & edge-protection guide
wrangler.jsonc / open-next.config.ts  # Cloudflare / OpenNext config
```

---

## 6. Setup & Local Development

Prerequisites: Node.js 20.9+ / pnpm

```bash
pnpm install

# Set the GitHub token (a fine-grained PAT with public-repo read scope is recommended)
cp .dev.vars.example .dev.vars   # Fill in GITHUB_TOKEN (.env.local also works for `next dev` only)

# http://localhost:3000 (/ redirects to /search)
pnpm dev
```

> The app works without a token, but GitHub's unauthenticated rate limit is very low, so setting one is recommended.
> If you want to use a UI library, initialize Tailwind / shadcn with `pnpm dlx shadcn@latest init` or similar (§8).

---

## 7. Testing

```bash
pnpm test            # Vitest (unit / API / component / i18n)
pnpm test:coverage   # The above + coverage (80% threshold)
pnpm e2e             # Playwright (browsers required: pnpm exec playwright install)
pnpm lint            # ESLint
pnpm typecheck       # tsc --noEmit
```

**Testing strategy**

| Layer | Tools | Targets |
|---|---|---|
| Unit | Vitest | Page-count calculation, 5-page window, rate-limit logic, watchers/issues mapping, cache TTL, BFF client, HTTP/error formatting |
| API | Vitest + MSW | Route Handler formatting, error handling, cache HIT/MISS, 429 (GitHub mocked) |
| Component | React Testing Library | Search form, list, paginator (5-page window, first/last), empty/error states, all detail fields, 404, 429 |
| i18n | Vitest | en/ja key consistency, ICU expansion under the Japanese locale |
| E2E | Playwright | search→list→detail→back, 404 for a non-existent repo, persistence of language/theme switching |

Measured results: **all 69 unit/integration tests green, overall coverage 95.56% (clearing the 80% threshold on every metric)**. The E2E suite (4 cases) requires a browser, so it runs locally / in CI.

---

## 8. Deployment (overview)

Deploys to Cloudflare Workers via the OpenNext adapter. **See [`DEPLOY.md`](./DEPLOY.md) for the full procedure and edge-protection settings.**

```bash
# First time only: create KV → reflect the id in wrangler.jsonc, register Worker secrets
pnpm exec wrangler kv namespace create RATE_LIMIT_KV
pnpm exec wrangler kv namespace create CACHE_KV
pnpm exec wrangler secret put GITHUB_TOKEN

pnpm deploy   # = opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

CI (`.github/workflows/ci.yml`) deploys only when **test / e2e are green and the push is to main**.
Authentication uses a scoped API token (`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` managed as GitHub Secrets, **never committed**).

> **About OIDC**: GitHub OIDC was originally planned, but as of 2026-06 **Wrangler deployment to Cloudflare Workers does not support GitHub OIDC** (`wrangler-action#402` and others remain open), so the API token approach was adopted instead. See `DEPLOY.md` for details and sources.

---

## 9. Known Limitations & Trade-offs

- **Search results are capped at the first 1,000 items** (GitHub spec) → up to 10 pages.
- **Watcher = `subscribers_count`, and the Issue count includes PRs** (GitHub spec; annotated in the UI).
- **The UI library (Tailwind/shadcn) is delegated to environment-side init.** For `dark:` styling to take effect, Tailwind must be configured with `darkMode: "class"` (the theme toggle itself correctly applies `<html class="dark">`).
- **E2E requires running a browser** (this repository's standalone automated tests are covered by Vitest; E2E runs locally/in CI).
- **CSP is enabled in production** (commented out by default for dev-server compatibility, starting from Report-Only).
- When running on the free tier, note that WAF/rate-limiting rules apply **per custom domain (zone)** and do not apply to `*.workers.dev` (`DEPLOY.md`).

---

## 10. AI Usage Report

This assignment was implemented through **agentic, phase-driven development using Claude**. Each phase iterated on "implement → actually run the tests in an isolated environment and confirm green → integrate."

### 10.1 What was delegated to the AI
Design drafts, boilerplate (Route Handlers, components, types), test scaffolding, documentation drafts, and refactoring suggestions. This was effective in terms of iteration speed and thoroughness.

### 10.2 What was guaranteed by human (my own) judgment and verification
Rather than trusting the AI's output as-is, the following were explicitly verified and decided. This is the crux of quality.

- **Version-dependent and latest specs were checked against official documentation each time**, so as not to rely on the AI's memory.
  - Confirmed the Cookie-based configuration of `next-intl v4` (`getRequestConfig` / `NextIntlClientProvider` / Server Action) against the official guide.
  - Confirmed via the official CLI docs that OpenNext deployment uses `opennextjs-cloudflare deploy` (not a direct `wrangler deploy`), and fixed the scripts accordingly.
  - Confirmed **Cloudflare's lack of GitHub OIDC support** and **redesigned the planned "OIDC deployment" to an API token approach**.
  - Checked the current spec of Cloudflare free-tier rate limiting. **Items whose official values could not be confirmed are explicitly marked "unverified" in the README / `DEPLOY.md`.**
- Reflected **GitHub API domain pitfalls** (`watchers_count` ≠ real watchers, `open_issues_count` includes PRs, the 1,000-item search cap) into the requirements, implementation, and UI labels.
- **Isolating a test-harness defect**: With React 19 + Vitest async effects, I encountered a phenomenon where "the component correctly `catch`es, yet the expected rejection is falsely detected as unhandled." Through repeated hypothesis testing I identified the cause (a settle outside the `act` scope interfering with mock resets) and resolved it by flushing with `act(async)`, pre-handling the expected rejection, and adjusting the mock-reset policy (the component itself was confirmed to work correctly in a real browser).
- **Confirming that all tests run**: actually ran the 69 unit/integration tests + coverage (~95%) and confirmed green. The E2E suite is also prepared in a runnable form.

### 10.3 Reflections
The AI contributed greatly to implementation speed and thoroughness, but **the latest external specs, security decisions, domain-specific pitfalls, and test-environment-specific defects** were impossible to handle without human verification. The work proceeds with a division of labor where the AI is used to "speed up drafting and iteration," while **fact-checking and design decisions are guaranteed by me**.

## 11. Branches

- `main`: After the deployment is succeeded, you should merge changes from `develop` into `main` branch to manage the latest succeeded commit.
- `develop`: The target branch to be built & be deployed

---

## License / Notes

This is an implementation for a selection assignment. Code comments and documentation are written in English.
