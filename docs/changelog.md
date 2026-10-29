# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Every PR adds its entry under **Unreleased**; when a release reaches production, that section gets a date.

## Unreleased

### Roadmap: freemium

- **Added:** iteration 9 (draft): a paid Community. **Join the Community** in Settings leads to the payment (€6 a month or €60 a year); the Community icon shows as premium for non-members and opens Settings; leaving ends the membership at once. Payments by MB WAY confirmed automatically by the provider's webhook; an admin download of the payments between two dates (PDF and CSV, with a summary for the tax return). Decision #75.

### Join the Community

- **Changed:** the Settings switch **Show me in the Community** is now **Join the Community**, with a text on what the Community tab offers (rankings at your club per discipline and field, this month, last month or this year, the podium, the shooter just above you). The FAQ, the home page and the Community note follow. Groundwork for iteration 9 (paid Community). R28.

### History periods

- **Changed:** History shows **This month** by default, with **Last month** and **All time**, besides the discipline filter (both in the URL). Decision #74. R8, R56.

### Community periods

- **Changed:** the Community has **This month**, **Last month** and **This year** instead of the month arrows. `GET /api/community/leaderboard` takes `period=month|year`. Decision #73. R55.
- **Fixed:** installed apps still on the version before the club choice got an empty Community (the API answered 400 without `clubId`); the API now uses the user's home club. R26.

### Every series has a club and a field

- **Changed:** club and field are required on every series, also when editing: **No club** and **No field** are gone, and so is the "No field" group on the Dashboard. Migration 0008 puts the series without them at CCM, Compak Sporting on Field 4 and Fosso on Field 2; the CSV import does the same. Decision #72. R49, R52, R53, R54.

### Community per club and field

- **Changed:** the Community ranks one month at a club (the home club first), in one of the club's disciplines and, optionally, on one field (**All fields** by default; only the fields with that discipline). Day and Week are gone; the arrows step by month. Series without a club are not ranked. `GET /api/community/leaderboard` takes `clubId` and `fieldId` instead of `period`. FAQ and home page texts follow. Decision #71. R26, R27, R36, R53.

### Dashboard per club and field

- **Added:** **Club** on the Dashboard (the home club by default, or All clubs) and **Consider fields**, which shows a card and a bar per field and marks each field with its own shape in the scores chart; both kept on the device. `GET /api/dashboard` returns the club and field of each point (the device cache is renewed: `CACHE_BUSTER` v4). Decision #70. R52.
- **Changed:** the scores chart follows the Dashboard period; its own range (3 months, 6 months, 1 year, All time) is gone (supersedes #55). R29.
- **Fixed:** same-day series kept changing order in the chart (imported series share their creation time); they are now ordered by creation, then id.

### Add button and logo

- **Added:** a round **+** button at the bottom right of Dashboard, History and Community that opens Add, and the app logo before "Welcome" as a link to the Dashboard. Decision #69. R51.

### Disciplines

- **Changed:** the app records only Compak Sporting, Fosso and Helice. The 3 Trap series become Fosso (also in the CSV import); series in any other discipline are deleted (migration 0007). The public site still describes all five. R1, R2, R24, R25, R27.

### Roadmap

- **Changed:** iteration 7 (Clubs) rewritten: the admin registers clubs (name and email, which only the admin can change); the club receives an initial password by email, must change it on the first sign-in, and manages its photo, fields and the disciplines of each field.

### Clubs and fields

- **Added:** each series records the club and field where it was shot. Add asks for the club (the home club first), then the discipline (the club's), then the field (only those with that discipline; required). History shows "CCM · Field 2". Older series can get a field when edited, or stay without one. R49.
- **Added:** **My club** in Settings, chosen from the list of clubs (the first one until chosen), and a **Clubs** page (account menu) with each club's fields and disciplines. R50.
- **Added:** migration 0006 (`sessions.club_id`, `sessions.field_id`, `profiles.home_club_id`) and `GET /api/clubs`. The imported history is at CCM.
- **Changed:** hardest targets (A–F) only in Compak Sporting, no longer in Sporting. R5.

### Disciplines page

- **Added:** maximum cartridge load and shot size for each discipline, from the FPTAC table of recognised ammunition (August 2026), with the source linked. R41.

### Notifications

- **Added:** notifications in the app (`/app/notifications`) with a bell counting the unread ones: sign-up received and account active for users; new sign-ups (with a link to the pending users) and contact form messages for admins. Pending users see theirs too. Decision #65. R46, R48.
- **Changed:** **Remove** in Admin now revokes the access with a message: the sessions are deleted at once and the account is deleted when the user reads the message; **Delete now** removes it straight away. R23, R47.
- **Added:** migration 0005 (`notifications` table, `revoked` status).

### Contact

- **Added:** contact page on the public site (`/contactos`, `/en/contact`), linked in the header and footer; messages are emailed to the owner through Gmail (`SMTP_USER`, `SMTP_PASSWORD`, `CONTACT_TO_EMAIL`). `POST /api/contact`, with a honeypot and a rate limit. Decision #64. R44, R45.

### Metrics

- **Added:** Vercel Web Analytics and Speed Insights on the public site and the app (only in builds on Vercel; no query strings sent). Decision #63. R42, R43.

### Public site

- **Added:** public pages for visitors, prerendered for search engines: home (`/`), disciplines (`/modalidades`) and FAQ (`/faq`) in European Portuguese, and the same in English under `/en`; `sitemap.xml`, `robots.txt`, a 404 page. Decision #62. E2E R40, R41.
- **Added:** FAQ questions on installing the app on a phone and on updates.
- **Changed:** the app moved to `/app` (old links redirect); the sign-in screen links to the public home page and FAQ. The installed app keeps opening the app.
- **Added:** Google Search Console verification tag on the public pages.
- **Changed:** `@shooting-clays/shared` exposes `./disciplines` and `./locales`, and `LOCALES` moved to `locales.ts`.

### Dashboard order and Settings

- **Changed:** the Dashboard shows the scores-over-time chart first, then the averages chart, then the discipline cards. E2E R39.
- **Changed:** **Clear cache and reload** moved from Admin to Settings (admins only). R38.
- **Removed:** the FAQ link under the Community ranking (the FAQ is in the menu). Decision #61.

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
