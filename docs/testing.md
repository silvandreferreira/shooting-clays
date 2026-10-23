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
- **Sign-in without Google:** the fixture (`e2e/fixtures.ts`) answers `/auth/*` like Neon Auth (session, sign-in, sign-out) and returns JWTs minted by `POST /api/__test__/token` (E2E only), signed with the API's local E2E key. The production build and the real API token verification are what run. Tests are signed in as `owner@example.test` unless they set `signedInAs`.
- Browser profiles: **Pixel (Chromium)**, **iPhone (WebKit)**, **Desktop Chrome**.
- Playwright starts both servers (`apps/web/playwright.config.ts`): the API in E2E mode on port **3100** and a production build of the web app (`vite build && vite preview`) on port **4173**, proxying `/api` to 3100. They do not clash with `pnpm dev` (3000/5173).
- All tests share one database and reset it before each test (fixture in `apps/web/e2e/fixtures.ts`), so they run **serially** (one worker).
- The service worker is blocked in tests; the app cache under test is the TanStack Query cache in IndexedDB.

## Production smoke tests (S1)

`apps/web/playwright.smoke.config.ts`, read-only, run by `.github/workflows/smoke.yml` after each production deployment. To run by hand:

```bash
PROD_URL=https://<web-domain> pnpm --filter @shooting-clays/web test:smoke
```

## Regression suite

Keep this table up to date: every row maps to at least one test.

| #   | Scenario                                                                                                                                          | File                       | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------- |
| R1  | Dashboard shows the reference values for all 3 periods                                                                                            | `dashboard.spec.ts`        | active  |
| R2  | A period without data shows "—"                                                                                                                   | `dashboard.spec.ts`        | active  |
| R3  | Offline (API and Neon Auth down), the dashboard opens from the cache                                                                              | `cache.spec.ts`            | active  |
| R4  | Adding a session updates the dashboard without a reload and without a second `GET /api/dashboard`                                                 | `add-session.spec.ts`      | active  |
| R5  | A–F checkboxes only for Compak Sporting and Sporting; cleared when switching discipline                                                           | `add-session.spec.ts`      | active  |
| R6  | Score outside 0–25 is rejected                                                                                                                    | `add-session.spec.ts`      | active  |
| R7  | API error on save keeps the form filled in                                                                                                        | `add-session.spec.ts`      | active  |
| R8  | Editing and deleting in History updates the dashboard                                                                                             | `history.spec.ts`          | active  |
| R9  | Visual baselines for Dashboard and Add (phone + desktop)                                                                                          | `visual.spec.ts`           | active¹ |
| R10 | No serious accessibility violations, in light and dark mode                                                                                       | `a11y.spec.ts`             | active  |
| R11 | `/api/__test__/reset` does not exist outside E2E mode                                                                                             | API integration test       | active  |
| R12 | History shows hardest targets as "A, C and F", only when recorded                                                                                 | `history.spec.ts`          | active  |
| R13 | Signed out: every route shows the sign-in screen (no API calls); Google sign-in opens the dashboard                                               | `auth.spec.ts`             | active  |
| R14 | Email not in `ADMIN_EMAILS`: "Access is not open yet", no data, sign out works                                                                    | `auth.spec.ts`             | active  |
| R15 | Header greets by first name; sign out removes the persisted cache and the last user                                                               | `auth.spec.ts`             | active  |
| R16 | Switching account on the same device never shows the previous user's cached data                                                                  | `auth.spec.ts`             | active  |
| R17 | API: no/invalid/expired token → 401; unverified or non-allowed email → 403; a user can never read, change or delete another user's sessions (404) | API integration tests      | active  |
| S1  | Production: `/api/health` ok, dashboard loads, navigation works                                                                                   | `smoke.spec.ts` (`@smoke`) | active  |

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
