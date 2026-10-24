# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Every PR adds its entry under **Unreleased**; when a release reaches production, that section gets a date.

## Unreleased

### Iteration 4 — Community

- **Changed:** iteration 4 rules (decision #53, supersedes #20): Day / Week / Month leaderboards with Month by default; ranking by number of series at 25, then 24, down to 0; podium for the top three; appearing in the Community is opt-out from a new Settings screen.

### Roadmap

- **Added:** iteration 7 (Clubs: managers, adding shooters from the app or with an invite link) and iteration 8 (official results recorded by clubs vs unofficial results recorded by shooters, Unofficial by default). Decision #54.

### Dashboard charts

- **Added:** the scores chart legend is a row of toggle buttons: tap a discipline to hide or show its line (iteration 5, done early). E2E R24.
- **Changed:** "Average by discipline" shows on each bar the average plus the lowest and highest score (whisker and "min–max" label), with a note under the chart and a tooltip listing all three. E2E R25.

## 2026-10-23 — iteration 3 in production

### Iteration 3

- **Added:** account states: new users are `pending` (approval banner, sample dashboard, Add disabled, no History), `active` or `disabled` ("Your account is inactive"); enforced by the API (`403 ACCOUNT_PENDING` / `ACCOUNT_DISABLED`); the app re-checks on open and focus.
- **Added:** admin screen (`/admin`) with a pending badge: user list with email, sign-up date, sessions and last activity; approve/disable with undo; permanent removal (profile, sessions and Neon Auth user) after typing the name.
- **Added:** `GET /api/me`, `GET/PATCH/DELETE /api/admin/users`; migration 0002 (`profiles.role`, `status`, `status_changed_at`).
- **Changed:** `ADMIN_EMAILS` now names the admins (always active) instead of the only accounts allowed in; `GET /api/me/profile` replaced by `GET /api/me`; "Access is not open yet" removed (R14 retired).
- **Added:** API tests R19 and E2E R20–R23.
- **Fixed:** `pnpm db:generate --name …` documented without the `--` that pnpm 12 passes through.
- **Changed:** Vercel sends deployment events to GitHub (`repository_dispatch`), so the production smoke tests run after each deploy (README 4.5).

## 2026-10-23 — first production release (iterations 1 and 2)

### Deployment

- **Fixed:** production smoke test S1 checks the signed-out app (sign-in screen, API 401, `/auth` proxy) instead of the dashboard, and the smoke workflow now starts on Vercel's `repository_dispatch` event (Vercel creates no GitHub Deployments).
- **Changed:** one Vercel project serves the web app and the API (`/api/*`, `/auth/*`); `pnpm build` writes the deployment to `.vercel/output` (decision #46). Previews use the Neon `dev` branch.
- **Changed:** the API forwards `/auth/*` to Neon Auth (`NEON_AUTH_URL`) in development and production; Vite passes `/auth/*` to the local API.
- **Docs:** Google OAuth consent screen must be External and published (README 4.7).

### Iteration 2

- **Added:** Google sign-in with Neon Auth (through `/auth` on our own origin), sign-in screen, "Access is not open yet" screen, header with "Welcome, <first name>" and an account menu (Google photo, Sign out).
- **Added:** API authentication (Bearer JWT verified with the Neon Auth JWKS), access limited to verified emails in `ADMIN_EMAILS`, all data per user; `GET/PUT /api/me/profile`.
- **Added:** table `profiles` (migration 0001) and `pnpm db:assign-owner`; `pnpm db:import` now imports for the owner.
- **Changed:** the device cache belongs to one user and is deleted on sign out.
- **Fixed:** focused or scrolled-to elements are no longer hidden behind the bottom navigation (scroll padding).
- **Added:** E2E R13–R16 (sign-in flows, access, sign out, account switch) and API tests R17; R3 now also covers Neon Auth being unreachable.

### Iteration 1

- **Added:** pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`) with TypeScript strict, ESLint, Prettier, Lefthook hooks and GitHub Actions (CI, production smoke tests, snapshot update).
- **Added:** `packages/shared`: disciplines, Zod schemas and dashboard statistics, tested against the reference values.
- **Added:** REST API (Hono + Drizzle): health, disciplines, dashboard and sessions CRUD; migration `0000_create_sessions`; idempotent CSV import (`pnpm db:import`); structured JSON logging and optional Sentry.
- **Added:** web app: Dashboard (periods, cards, charts), Add, History with edit/delete, persisted cache (IndexedDB), PWA, dark mode, i18n strings file.
- **Added:** History shows each session's hardest targets as a readable list ("A, C and F").
- **Fixed:** returning to the dashboard after saving no longer makes a second `GET /api/dashboard` (R4 now checks it).
- **Added:** accessibility checks (R10) also run in dark mode.
- **Changed:** repository is public; `main` is protected and only accepts squash-merged PRs whose CI (checks, build and E2E) passed.
- **Removed:** hardest-target counts chart from the product scope (decision #35).
- **Added:** E2E regression suite R1–R12 and smoke test S1 (Playwright on Pixel, iPhone and desktop profiles, with axe accessibility checks).
- **Added:** project specification and documentation (`CLAUDE.md`, `README.md`, `docs/`), including the regression testing strategy, observability plan and roadmap for iterations 2 (authentication) and 3 (community).
- **Added:** roadmap for iteration 4 (admin approval, disable and removal of users).
- **Changed:** roadmap order: iteration 3 is now Admin and iteration 4 Community (decision #38).
- **Added:** roadmap for iteration 6 (translations: English / European Portuguese, chosen per user).
- **Added:** roadmap for iteration 5 (scores chart with its own time range and show/hide per discipline).
