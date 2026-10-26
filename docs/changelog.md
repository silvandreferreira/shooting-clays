# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Every PR adds its entry under **Unreleased**; when a release reaches production, that section gets a date.

## Unreleased

### Week and scores chart

- **Changed:** Community weeks run Sunday to Saturday (was Monday to Sunday). Decision #60. R27.
- **Fixed:** the scores chart showed the average of same-day series (e.g. 14.5); it now shows one point per series, so only real scores appear. Decision #60.

### Admin

- **Added:** search by name or email and filters All · Active · Pending (with counts) on the Admin page. E2E R37.
- **Added:** **Clear cache and reload** on the Admin page: clears this device's cached data, app files and service worker, then reloads. E2E R38.
- **Changed:** no status text under the last activity; the switch shows it. Decision #59.

### Community medals and FAQ

- **Changed:** Community entries show only the name and the best score (no number of series); the rules sentence under the ranking is gone. Decision #58. R27.
- **Added:** gold, silver and bronze on the podium (step, ring around the photo and a small medal); shared places share the medal. R27.
- **Added:** FAQ page (`/faq`) with the ranking and tie-break rules and other common questions, in both languages; linked from the menus, under the Community ranking and on the sign-in screen (public). E2E R36.

### Navigation and Community

- **Changed:** on phones and tablets (narrower than 1024 px) the bottom bar and the account menu become one header **Menu** with every page, Settings and Sign out; desktop stays as it was. Decision #57. E2E R34, R35.
- **Changed:** Community shows only the best score; how many times it was reached still breaks ties but is not shown (R27).
- **Fixed:** Community and Admin showed the initial instead of the Google photo when the profile had no stored photo; the API now reads the photo from Neon Auth (R26). The photo also fills the larger circle of the 1st place.

### Docs

- **Changed:** roadmap marks iteration 6 as done; changelog sections for iterations 4–6 are dated.

## 2026-10-26 — iteration 6 in production

### Iteration 6 — Translations

- **Added:** the app in European Portuguese: language picker (English · Português) in Settings and on the sign-in screen; switches at once; first visit follows the browser; the choice is kept on the device and in the profile. Dates, lists, form and API errors follow the language. Migration 0004 (`profiles.locale`). Decision #56. E2E R30–R33; R9 and R10 also in pt-PT.
- **Changed:** score validation message is now "Score must be a whole number from 0 to 25." (R6).

## 2026-10-25 — iterations 4 and 5 in production

### Iteration 4 — Community

- **Added:** Community tab (`/community`): ranking per discipline for a day, week or month (month by default), stepping back to earlier periods; podium for the top three, then a list with your own row highlighted. API `GET /api/community/leaderboard`. Tests R26–R28.
- **Added:** Settings screen (`/settings`, from the account menu): display name and "Show me in the Community" (on by default). Migration 0003 (`profiles.show_in_community`, index `sessions (discipline, date)`).
- **Changed:** iteration 4 rules (decision #53, supersedes #20): Day / Week / Month leaderboards with Month by default; ranking by number of series at 25, then 24, down to 0; podium for the top three; appearing in the Community is opt-out from a new Settings screen.

### Roadmap

- **Added:** iteration 7 (Clubs: managers, adding shooters from the app or with an invite link) and iteration 8 (official results recorded by clubs vs unofficial results recorded by shooters, Unofficial by default). Decision #54.

### Dashboard charts

- **Added:** the "Scores over time" chart has its own range selector: 3 months (default), 6 months, 1 year, All time; it no longer follows the Dashboard period (iteration 5 done, decision #55). E2E R29.
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
