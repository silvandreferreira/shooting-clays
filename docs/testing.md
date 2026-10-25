# Testing

> Goal: **any change that breaks something that used to work is caught before it reaches `main`.** If behaviour changes on purpose, the test changes in the same branch and the PR explains why.

## Layers

| Layer                  | Location                      | Tools                                  | What it guarantees                                                         |
| ---------------------- | ----------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Unit                   | `packages/shared`             | Vitest                                 | Statistics, schemas, discipline rules (later: ranking)                     |
| Unit                   | `apps/api`                    | Vitest                                 | CSV mapping, utilities                                                     |
| Integration            | `apps/api`                    | Vitest + Hono `app.request()` + PGlite | Full endpoints against a real in-memory Postgres with migrations applied   |
| Component              | `apps/web`                    | Vitest + Testing Library               | Isolated component behaviour                                               |
| **E2E / regression**   | `apps/web/e2e`                | **Playwright**                         | The whole app (web + API + DB) in real browsers, phone and desktop         |
| **Visual regression**  | `apps/web/e2e`                | Playwright `toHaveScreenshot`          | Screens do not change look by accident                                     |
| Accessibility          | `apps/web/e2e`                | `@axe-core/playwright`                 | No serious violations                                                      |
| **Smoke (production)** | `apps/web/e2e` (tag `@smoke`) | Playwright                             | After each deploy: production responds and the dashboard loads (read-only) |

## Commands

| Command                | What it runs                                                                    | When                                      |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm test`            | Unit + integration + component tests                                            | Constantly while developing               |
| `pnpm test:watch`      | Same, in watch mode                                                             | While developing                          |
| `pnpm test:e2e`        | Builds web, starts the API in E2E mode, runs Playwright on all browser profiles | After any UI or API change                |
| `pnpm test:e2e:ui`     | Playwright interactive UI                                                       | Writing or debugging E2E tests            |
| `pnpm test:e2e:report` | Opens the last HTML report                                                      | After a failure                           |
| `pnpm check`           | `format:check` + `lint` + `typecheck` + `test` (no E2E)                         | Runs automatically on `git push`          |
| `pnpm test:all`        | `check` + `build` + `test:e2e`                                                  | **Before opening a PR** (see `README.md`) |

First time only: `pnpm exec playwright install --with-deps` (downloads the browsers).

## How E2E mode works

- The API starts with `E2E=1`: in-memory **PGlite** database seeded from `data/clays-results.csv`. No Neon, no internet.
- The reference date is **2026-10-23** (`APP_NOW` in the API; in the browser `page.clock.install` starts the clock there and lets it run — a frozen clock would stall the cache persister, which waits for time to pass between writes).
- `POST /api/__test__/reset` reseeds the data between tests. It exists **only** in E2E mode.
- **Sign-in without Google:** the fixture (`e2e/fixtures.ts`) answers `/auth/*` like Neon Auth (session, sign-in, sign-out) and returns JWTs minted by `POST /api/__test__/token` (E2E only), signed with the API's local E2E key. The production build and the real API token verification are what run. Tests are signed in as `owner@example.test` (the only `ADMIN_EMAILS` address in E2E mode, so an admin) unless they set `signedInAs`. The fixtures also provide an approved user (`OTHER`), a pending one (`PENDING`) and a disabled one (`DISABLED`); `__test__/token` gives a new user that status, and `registerUser()` signs someone in on the API side so the admin can see them.
- Browser profiles: **Pixel (Chromium)**, **iPhone (WebKit)**, **Desktop Chrome**.
- Playwright starts both servers (`apps/web/playwright.config.ts`): the API in E2E mode on port **3100** and a production build of the web app (`vite build && vite preview`) on port **4173**, proxying `/api` to 3100. They do not clash with `pnpm dev` (3000/5173).
- All tests share one database and reset it before each test (fixture in `apps/web/e2e/fixtures.ts`), so they run **serially** (one worker).
- The service worker is blocked in tests; the app cache under test is the TanStack Query cache in IndexedDB.

## Production smoke tests (S1)

`apps/web/playwright.smoke.config.ts`, read-only and signed out, run by `.github/workflows/smoke.yml` after each production deployment (Vercel's `vercel.deployment.success` `repository_dispatch` event) or by hand from the Actions tab (_Run workflow_). To run by hand:

```bash
PROD_URL=https://<web-domain> pnpm --filter @shooting-clays/web test:smoke
```

## Regression suite

Keep this table up to date: every row maps to at least one test.

| #   | Scenario                                                                                                                                                                                                                                                                                                                                                                               | File                                           | Status                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------- |
| R1  | Dashboard shows the reference values for all 3 periods                                                                                                                                                                                                                                                                                                                                 | `dashboard.spec.ts`                            | active                    |
| R2  | A period without data shows "—"                                                                                                                                                                                                                                                                                                                                                        | `dashboard.spec.ts`                            | active                    |
| R3  | Offline (API and Neon Auth down), the dashboard opens from the cache                                                                                                                                                                                                                                                                                                                   | `cache.spec.ts`                                | active                    |
| R4  | Adding a session updates the dashboard without a reload and without a second `GET /api/dashboard`                                                                                                                                                                                                                                                                                      | `add-session.spec.ts`                          | active                    |
| R5  | A–F checkboxes only for Compak Sporting and Sporting; cleared when switching discipline                                                                                                                                                                                                                                                                                                | `add-session.spec.ts`                          | active                    |
| R6  | Score outside 0–25 is rejected                                                                                                                                                                                                                                                                                                                                                         | `add-session.spec.ts`                          | active                    |
| R7  | API error on save keeps the form filled in                                                                                                                                                                                                                                                                                                                                             | `add-session.spec.ts`                          | active                    |
| R8  | Editing and deleting in History updates the dashboard                                                                                                                                                                                                                                                                                                                                  | `history.spec.ts`                              | active                    |
| R9  | Visual baselines for Dashboard and Add (phone + desktop)                                                                                                                                                                                                                                                                                                                               | `visual.spec.ts`                               | active¹                   |
| R10 | No serious accessibility violations (Dashboard, Add, History, Community, Settings), in light and dark mode                                                                                                                                                                                                                                                                             | `a11y.spec.ts`                                 | active                    |
| R11 | `/api/__test__/reset` does not exist outside E2E mode                                                                                                                                                                                                                                                                                                                                  | API integration test                           | active                    |
| R12 | History shows hardest targets as "A, C and F", only when recorded                                                                                                                                                                                                                                                                                                                      | `history.spec.ts`                              | active                    |
| R13 | Signed out: every route shows the sign-in screen (no API calls); Google sign-in opens the dashboard                                                                                                                                                                                                                                                                                    | `auth.spec.ts`                                 | active                    |
| R14 | Email not in `ADMIN_EMAILS`: "Access is not open yet" (iteration 2 only)                                                                                                                                                                                                                                                                                                               | —                                              | retired (replaced by R20) |
| R15 | Header greets by first name; sign out removes the persisted cache and the last user                                                                                                                                                                                                                                                                                                    | `auth.spec.ts`                                 | active                    |
| R16 | Switching account on the same device never shows the previous user's cached data                                                                                                                                                                                                                                                                                                       | `auth.spec.ts`                                 | active                    |
| R17 | API: no/invalid/expired token → 401 (also for a removed user's still-valid token); a user can never read, change or delete another user's sessions (404)                                                                                                                                                                                                                               | API integration tests                          | active                    |
| R18 | API `/auth/*` proxy: forwards path, query, method, body, cookies and Origin to `NEON_AUTH_URL` without our hop headers; returns redirects unfollowed and every cookie without `Domain`; 503 when Neon Auth is unreachable; the server app serves `/api` and `/auth` and never the test routes                                                                                          | API integration tests                          | active                    |
| R19 | API account states and admin: pending/disabled get 403 `ACCOUNT_PENDING`/`ACCOUNT_DISABLED` everywhere but `GET /api/me`; `ADMIN_EMAILS` (verified) → active admin; non-admins 403 on `/api/admin/*`; approve/disable/undo apply at once; removal deletes profile, sessions and Neon Auth user and nothing else; admins cannot change admin accounts; removal log has no personal data | API integration tests (`admin.test.ts`)        | active                    |
| R20 | Pending user: approval banner, sample data labelled on every card and chart (no data requests), Add disabled with an explanation, no History; no serious a11y violations                                                                                                                                                                                                               | `account.spec.ts`                              | active                    |
| R21 | Disabled user: only "Your account is inactive", no navigation or data; sign out works                                                                                                                                                                                                                                                                                                  | `account.spec.ts`                              | active                    |
| R22 | Admin tab shows the pending count; the admin approves (with undo) a pending user, who then sees their real, empty dashboard; admin page has no serious a11y violations                                                                                                                                                                                                                 | `account.spec.ts`                              | active                    |
| R23 | Admin removes a user only after typing their name; signing in again starts over as pending                                                                                                                                                                                                                                                                                             | `account.spec.ts`                              | active                    |
| R24 | Scores chart: one toggle per discipline under the chart, all on by default; a tap hides that line (`aria-pressed=false`), another shows it; all shown again after a reload                                                                                                                                                                                                             | `dashboard.spec.ts` (+ `ScoresChart.test.tsx`) | active                    |
| R25 | "Average by discipline": each bar shows the average and the lowest–highest score for the selected period (reference values)                                                                                                                                                                                                                                                            | `dashboard.spec.ts`                            | active                    |
| R26 | API Community leaderboard: ranked by series at 25, then 24, …; only active users with "Show me in the Community" on; one entry per user; no ids or emails; only the discipline and day/week/month asked for; switch and display name via `PUT /api/me/profile`                                                                                                                         |
| R27 | Community: Month by default with podium (1st–3rd) and the list from 4th with my row highlighted; Week and Day; previous periods; empty period message                                                                                                                                                                                                                                  |
| R28 | Settings: changing the display name updates the header; "Show me in the Community" off removes me from the ranking with a note linking to Settings; on brings me back                                                                                                                                                                                                                  |
| S1  | Production, signed out: `/api/health` ok, `/api/dashboard` 401, `/auth/get-session` reaches Neon Auth, a deep link shows the sign-in screen                                                                                                                                                                                                                                            | `smoke.spec.ts` (`@smoke`)                     | active                    |

¹ R9 runs only on Linux (CI) and is skipped until the "Update snapshots" workflow has created the baselines.

Iterations 2, 3 and 4 add their own rows when they start (planned scenarios are listed in `roadmap.md` under each iteration's "Tests").

## Reference values (R1)

With `data/clays-results.csv` and reference date **2026-10-23** (rounded average / min / max):

| Discipline      | All time     | Last month (Sep 2026) | This month (Oct 2026) |
| --------------- | ------------ | --------------------- | --------------------- |
| Compak Sporting | 16 / 8 / 23  | 18 / 14 / 23          | 16 / 13 / 18          |
| Fosso           | 10 / 5 / 16  | 10 / 5 / 16           | —                     |
| Helice          | 4 / 4 / 4    | 4 / 4 / 4             | —                     |
| Trap            | 17 / 15 / 19 | —                     | 17 / 15 / 19          |

Source: `data/clays-data.csv`.

## Rules

1. **New feature** → E2E tests for its main flow + a new row in the regression table.
2. **Bug fix** → a test that reproduces the bug (fails before the fix, passes after) + a new row.
3. **Never delete or skip a test to make CI pass.** If behaviour changed on purpose, update the test and explain it in the PR.
4. **Visual baselines** are generated on Linux (same as CI) and stored next to `visual.spec.ts`. On macOS/Windows the visual tests are skipped. Until a baseline exists, its test is skipped too. After an intentional visual change, run the manual workflow **"Update snapshots"** in GitHub Actions and explain the change in the PR.

## CI (GitHub Actions)

| When                         | What runs                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Every push and PR            | `check` → `build` → `test:e2e` (all required to merge into `main`)                |
| An E2E test fails            | Playwright report (screenshots, video, trace) uploaded as a job artifact          |
| After each production deploy | `@smoke` tests against production; on failure an alert fires (`observability.md`) |
| Manually                     | "Update snapshots" workflow                                                       |
