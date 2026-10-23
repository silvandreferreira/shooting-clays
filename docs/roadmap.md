# Roadmap

| Iteration | Name                                 | Status            |
| --------- | ------------------------------------ | ----------------- |
| 1         | Core app                             | Done (2026-10-23) |
| 2         | Authentication (Google sign-in)      | Done (2026-10-23) |
| 3         | Admin (user approval and management) | **In progress**   |
| 4         | Community (leaderboards)             | Planned           |
| 5         | Interactive scores chart             | Planned           |
| 6         | Translations (English / Portuguese)  | Planned           |

When an iteration starts, mark it "In progress"; when it ships, mark it "Done" with the date and update `changelog.md`.

---

## Iteration 1 — Core app

Scope: everything in `product.md` except the Community screen.

Work plan:

1. Propose the final plan (structure, data model, screen sketches) and wait for approval.
2. Monorepo, ESLint, Prettier, TypeScript, Git hooks, CI. First commit and push.
3. `packages/shared`: disciplines, Zod schemas, statistics — reference-value tests passing (`testing.md`).
4. `apps/api`: Drizzle schema and migrations, Hono endpoints, integration tests with PGlite, CSV import script (run on the Neon `dev` branch first).
5. `apps/web`: dashboard, add form, history, persisted cache, PWA, i18n file.
6. E2E regression suite (`testing.md`): E2E mode, scenarios, visual baselines, CI job, production smoke tests.
7. Observability (`observability.md`): structured logger, health endpoints, error capture.
8. Vercel projects (rewrites, env vars, EU region) and the setup/deploy guide in `README.md`.
9. Final review: `pnpm test:all`, open the app at phone size, confirm reference values on screen.

All sessions use `user_id = 'local'` in this iteration.

### Status (2026-10-23)

| Step   | State                                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1–7, 9 | Done on branch `feat/iteration-1-core-app` (`pnpm test:all` green, runs locally against the Neon `dev` branch)                                                                                   |
| 8      | Partly done: `apps/web/vercel.json` and `apps/api/vercel.json` exist; the Vercel projects, their environment variables and the setup in `README.md` → 4.5 have **not** been done or verified yet |

### Known limitations and pending work

Deployment and operations:

- **Not deployed yet.** Pending: Vercel projects (README 4.5), migrations on the Neon `main` branch (`DATABASE_URL=<main> pnpm db:migrate`, then `pnpm db:import` if the history should be in production), Better Stack setup (`observability.md` → "One-time setup") and the GitHub secrets `PROD_URL` and `SMOKE_HEARTBEAT_URL`.
- **No authentication until iteration 2.** Once deployed, anyone who knows the URL can read, add, edit and delete sessions. Until then, keep the URL private and consider enabling Vercel Deployment Protection on both projects.
- Vercel setup replaced by one project (decision #46, README 4.5).

Tests:

- **Visual regression (R9) is inactive until baselines exist.** Baselines are Linux-only: after the first push, run the "Update snapshots" workflow once on the branch. Until then, and always on macOS/Windows, R9 is skipped (`testing.md`).
- Production smoke tests (S1) need `PROD_URL`; they only run after a production deployment.

Product:

- No offline queue: saving without a connection fails and keeps the form filled in (out of scope, see `product.md`).
- Imported history has no hardest targets (A–F); the old free text is kept in the notes, in Portuguese (`data-model.md` → Import).
- History loads every session at once (no pagination) and the edit screen finds the session in that list. Fine for hundreds of sessions; revisit if the history grows a lot.
- The production JavaScript bundle is about 840 kB (about 250 kB gzipped) in a single file; Vite warns about chunk size. Splitting the charts (Recharts) into a separate chunk is a possible improvement.

---

## Iteration 2 — Authentication

Goal: sign in with Google; each user only sees and changes their own data.

- **Neon Auth** (managed Better Auth) with the Google provider. Development can use Neon's shared Google credentials; production uses our own Google Cloud OAuth client.
- Sign-in screen; signed-out users are redirected to it. Sign-out in a profile menu.
- A header on every screen greets the user by first name: **"Welcome, <first name>"** (first word of the profile's display name, which comes from Google on first sign-in; string in `i18n/en.ts`).
- A `profiles` row is created on first sign-in (see `data-model.md`).
- **Temporary safeguard until iteration 3:** only email addresses listed in `ADMIN_EMAILS` can sign in; anyone else sees "Access is not open yet". This prevents strangers from using the app before the approval flow exists. Iteration 3 replaces it with the pending/approval flow.
- API middleware validates the session (cookie or JWT — confirm the mechanism in Neon Auth docs at the start of the iteration) and sets `userId`; every query is filtered by it.
- Migration: assign all `user_id = 'local'` sessions to the owner's account (one-off, documented script).
- Tests:
  - integration: a user can never read, update or delete another user's sessions (expect 404);
  - E2E: a test-only sign-in (enabled only with `E2E=1`) so tests do not depend on Google.
- Docs: `api.md` (auth, 401), `environments.md` (auth variables), `README.md` (Google OAuth setup), `decisions.md`.

### Status (2026-10-23)

In production since 2026-10-23 (https://shooting-clays.vercel.app): Neon Auth on `dev` and `main` (own Google OAuth client on `main`), sign-in verified in Chrome and Safari, API authentication and per-user data, profiles, `db:assign-owner` run on both branches. The `ADMIN_EMAILS` sign-in safeguard was replaced by account approval in iteration 3.

### Known limitations and pending work

- **Production setup (2026-10-23):** Neon Auth on `main` with our own Google OAuth client (email & password and "Allow localhost" off, domain `shooting-clays.vercel.app` trusted), migration 0001 and `db:assign-owner` on `main` (48 sessions). Vercel: one project (decision #46), README 4.5.
- **Sign-in on preview deployments** needs each preview domain trusted by the `dev` branch's Neon Auth (README 4.7).
- **Sign-in on the local network** (`pnpm dev:host` on a phone) does not work: the session cookie is `Secure` (HTTPS or `localhost` only).
- The display name can be changed through the API (`PUT /api/me/profile`) but there is no screen for it yet.

---

## Iteration 3 — Admin

Goal: the owner (admin) decides who can use the app. New users can sign in but must be approved; the admin can disable or remove accounts.

### Account states

| State       | How a user gets there                                             | What the user sees                                                                | Their data               |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| `pending`   | First Google sign-in (default for everyone not in `ADMIN_EMAILS`) | **Demo dashboard** with sample data, a clear banner and a disabled **Add** button | None yet                 |
| `active`    | Admin switches the toggle on                                      | The normal app (Dashboard, Add, History; Community from iteration 4)              | Kept                     |
| `disabled`  | Admin switches the toggle off for a previously active user        | "Your account is inactive" screen; no dashboard, no Add, no History, no Community | **Kept** in the database |
| _(removed)_ | Admin clicks **Remove** and confirms                              | The account no longer exists; signing in again starts over as `pending`           | **Deleted permanently**  |

Admins: users whose email is in `ADMIN_EMAILS` get `role = 'admin'` and `status = 'active'` on sign-in. The admin email is configured only as an environment variable, never in the repository.

### Pending user experience

- A prominent banner at the top of every screen, for example: **"Your account is waiting for approval. The administrator needs to accept your request before you can log your sessions. Meanwhile, this is a preview of your dashboard with sample data."**
- The dashboard renders **sample data** from a static fixture in the front end (no API call), with a "Sample data" label on every card and chart.
- The **Add** button is visible but greyed out and disabled; tapping it shows a short explanation (tooltip/toast).
- History (and Community, from iteration 4) are hidden.
- The app re-checks the account status when it opens and when it regains focus, so approval takes effect without signing out.

### Disabled user experience

- A full-screen notice: **"Your account is inactive. Contact the administrator if you think this is a mistake."** plus Sign out.
- No personal data is loaded or shown.

### Admin screen (`/admin`, admin only)

- **Admin** tab visible only to admins, with a badge showing the number of pending users.
- User list (pending first, then by sign-up date): avatar, display name, email, sign-up date, number of sessions, last activity, status.
- At the end of each row:
  - **Toggle**: on = `active`; off = `disabled` (or stays `pending` if never approved). Changes apply immediately, with an undo toast.
  - **Remove** button: opens a confirmation dialog that explains the deletion is permanent and requires typing the user's display name to confirm.
- An admin cannot disable or remove their own account (buttons hidden for their row; also enforced by the API).

### Removal = complete deletion

Inside one database transaction: delete all the user's `sessions` and their `profiles` row; then delete the user from Neon Auth (confirm the exact mechanism in the Neon Auth docs at the start of the iteration). After removal, no row anywhere references the user. The log records only `{ action: "user_removed", adminId, at }` — no personal data.

### Enforcement (server side — the UI is not enough)

- Middleware loads the profile after authentication:
  - `pending` → every data endpoint returns `403 ACCOUNT_PENDING`;
  - `disabled` → `403 ACCOUNT_DISABLED`;
  - only `GET /api/me` and sign-out work for these users.
- `/api/admin/*` requires `role = 'admin'`; otherwise `403 FORBIDDEN`.

### API

See `api.md` (`/api/me`, `/api/admin/users`).

### Tests

- Integration: pending/disabled users get 403 on every data endpoint; non-admins get 403 on `/api/admin/*`; toggling changes status; removal deletes every row for that user and nothing else; an admin cannot disable/remove themselves.
- E2E: pending user sees the banner, sample data and a disabled Add button; disabled user sees the inactive notice; admin approves a user and that user then sees their real (empty) dashboard; admin removes a user after typing the name.
- E2E mode provides test-only sign-in as a pending user, an active user and an admin.

### Status (2026-10-23)

Implemented on branch `feat/iteration-3-admin`: migration 0002 (applied to Neon `dev`), account states enforced in the API, `GET /api/me`, admin endpoints, pending/disabled screens, admin screen, tests R19–R23 (R14 retired). Decisions #47–#50.

Notes:

- Neon Auth users are removed with SQL in the same statement as our rows (decision #47), so removal is one transaction.
- Admin accounts (`ADMIN_EMAILS`) cannot be disabled or removed from the admin screen, by anyone (decision #49).
- Someone who signs in with Google but never reaches the API has no profile yet and is not listed; the app calls the API right after sign-in, so in practice everyone is listed.

### Backlog ideas (not committed)

Email the admin when someone new signs up; email the user when approved; admin view of a user's statistics.

---

## Iteration 4 — Community (gamification)

Goal: a new **Community** tab that compares results across all users, per discipline, to make the app more fun.

### Leaderboard rules

- Scope: **one calendar month** (Europe/Lisbon) and **one discipline**. Default: current month; the user can browse previous months.
- Each shooter's entry = **their best single series score** in that discipline in that month.
- Ranking: highest best score first. Ties share the same rank (standard competition ranking: 1, 1, 3); within a tie, whoever reached that score **first** is listed first.
- **Shooter of the month** per discipline = rank 1 (all tied shooters if there is a tie).
- Each row shows: rank, display name, avatar, best score, date achieved, number of series that month.
- The signed-in user's own row is always visible (pinned at the bottom if outside the visible list).
- Only shooters with at least one series in that discipline and month appear.

### Screen (`/community`)

- Month picker and discipline tabs.
- "Shooter of the month" cards (one per discipline) at the top.
- Full ranked list below.

### Privacy

- Joining the leaderboard is **opt-in** (`show_in_community`, default off), with a **display name** chosen by the user. The email address is never shown.
- Users who have not opted in are excluded from every leaderboard response (tested).
- Only `active` accounts (iteration 3) take part: users whose account is `pending` or `disabled` are excluded from every leaderboard response (tested).

### API and data

- `GET /api/community/leaderboard?month=YYYY-MM&discipline=…`
- `GET /api/community/champions?month=YYYY-MM` (shooter of the month per discipline)
- `GET /api/me/profile`, `PUT /api/me/profile` (display name, opt-in)
- Query: per user `max(score)` and earliest date at that score, then `rank() over (order by best desc)`. Index on `sessions (discipline, date)`.
- Cached in the front end with a short stale time (a few minutes).

### Tests

- Unit: ranking with ties, tie-break by earliest date, month boundaries in Europe/Lisbon.
- Integration: non-opted-in users excluded; `pending` and `disabled` users excluded; one entry per user.
- E2E: seeded multi-user data; leaderboard order, own row pinned, month switching.

### Known limitation

Scores are self-reported (trust-based). Possible later: report/flag a result.

### Backlog ideas (not committed)

Personal-best badges, streaks (sessions in consecutive weeks), "most improved" of the month, history of past champions.

---

## Iteration 5 — Interactive scores chart

Goal: make the "Scores over time" chart on the Dashboard easier to read by choosing its time range and which disciplines it shows. Independent of iterations 2–4: it only touches the front end and can be done before them if preferred.

### Time range

- The chart gets **its own range selector**, above the chart: **3 months** (default) · **6 months** · **1 year** · **All time**.
- The chart no longer follows the Dashboard period switcher (All time · Last month · This month); that switcher keeps controlling the cards and the "Average by discipline" chart.
- Ranges are rolling and inclusive, counted back from the reference date in Europe/Lisbon: e.g. "3 months" on 2026-10-23 covers 2026-07-23 to 2026-10-23. When the earlier month is shorter (31 May − 3 months), use the last day of that month.
- The range calculation lives in `packages/shared` and receives the reference date as a parameter (deterministic and unit-tested, like `stats.ts`).
- If no discipline has scores in the selected range, show "No series in this period." instead of an empty chart.

### Show/hide disciplines

- The chart legend becomes a row of **toggle buttons**, one per discipline in the chart, each with the discipline's colour swatch and name.
- **All disciplines are shown by default.** Tapping a legend item hides that discipline's line; tapping it again shows it.
- A hidden discipline stays in the legend, visibly "off" (outlined/greyed swatch and struck-through name), so it is not shown by colour alone.
- Buttons are accessible: `aria-pressed`, keyboard operable, touch targets ≥ 44 px.
- Hiding a line does not change other lines' colours (colour follows the discipline) and does not change the Y axis (always 0–25).
- If every discipline is hidden, the chart shows a short hint to tap a discipline to show it.
- The selection is per visit (not persisted); opening the app again shows all disciplines and the 3-month range.

### API and data

No API change: `GET /api/dashboard` already returns every score per discipline in `series`; the front end filters it by range and visibility.

### Tests

- Unit (`packages/shared`): range boundaries (inclusive start, month-end clamping, year boundary), "All time" includes everything.
- Component: legend toggles hide/show a line and update `aria-pressed`.
- E2E (fixed date 2026-10-23, reference CSV): default range is 3 months (no points before 2026-07-23); switching to 6 months / 1 year / All time adds the older points (the first series, 2026-04-12, appears only from 1 year); hiding Compak Sporting removes its line and showing it again restores it; all visible after reload.
- Visual baseline (R9) updated for the new Dashboard.
- Accessibility (R10) still passes in light and dark mode.

### Docs

`product.md` (Charts), `testing.md` (new regression rows), `changelog.md`.

---

## Iteration 6 — Translations (English / European Portuguese)

Goal: each user chooses whether the app is shown in **English** or **European Portuguese (pt-PT)**.

### Languages and default

- Supported: `en` (English) and `pt-PT` (European Portuguese). Codes are BCP 47 tags.
- First visit: follow the browser (`navigator.languages`): any `pt*` → `pt-PT`, anything else → `en`.
- Once the user picks a language, that choice wins on every device (see "Where the choice is saved").

### Language selector

- In the **account menu** (header, next to "Sign out"): "Language" with two options, **English** and **Português**, each written in its own language.
- Also on the **sign-in screen** (small switch below the button), so the choice is possible before signing in.
- Switching applies **immediately**, without reloading; the current screen and any form keep their state.
- `<html lang>` is updated to the active language (screen readers and hyphenation).

### Where the choice is saved

- Signed in: in the user's profile (`profiles.locale`, new column), via `PUT /api/me/profile`, so it follows the user to another phone or computer.
- Always also in `localStorage`, so the right language shows instantly on start, before sign-in and offline.
- On sign-in, the profile's value replaces the local one (if set).

### What is translated

| Item                                                          | How                                                                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All UI text (labels, buttons, headings, empty states, errors) | `apps/web/src/i18n/en.ts` (source) and new `pt-PT.ts`; `pt-PT.ts` is typed `satisfies Strings`, so a missing key fails `pnpm typecheck`                               |
| Discipline names                                              | Per language in the strings files (e.g. pt-PT: Compak Sporting, Percurso de Caça, Fosso, Trap, Hélice)                                                                |
| Dates and numbers                                             | `Intl` with the active locale (`en-GB` / `pt-PT`): "23 Oct 2026" / "23 out. 2026"                                                                                     |
| Lists                                                         | `Intl.ListFormat`: "A, C and F" / "A, C e F" (History → hardest targets)                                                                                              |
| Form validation messages                                      | The shared Zod schemas identify the rule broken (e.g. score out of range); the UI shows the message for that rule in the active language, instead of the English text |
| API errors shown to the user                                  | Mapped from the error `code` (e.g. `ACCESS_NOT_OPEN`) to translated text; the API itself keeps English messages (logs, developers)                                    |

Not translated: the user's own content (notes, display name), the imported history notes (they are already in Portuguese), email addresses, and anything in the repository other than the strings files (code, docs and API messages stay in English — see `CLAUDE.md` → Language rules).

### API and data

- Migration: `profiles.locale text null` with `check (locale in ('en','pt-PT'))`; `null` = not chosen yet (follow the browser).
- `GET /api/me/profile` returns `locale`; `PUT /api/me/profile` accepts `{ "locale": "en" | "pt-PT" }` (alone or with `displayName`).

### Tests

- Unit: every key in `en.ts` exists in `pt-PT.ts` with a non-empty value (also enforced by the type); date and list formatting per locale; browser-language detection.
- Integration: `PUT /api/me/profile` stores and returns `locale`; invalid values return `400 VALIDATION_ERROR`.
- E2E:
  - switching to Português in the account menu translates the Dashboard, Add and History immediately (no reload);
  - the choice survives a reload and a new sign-in (profile), and is used before sign-in (localStorage);
  - a browser in Portuguese starts in pt-PT on first visit;
  - form validation and API error messages appear in the active language;
  - accessibility (R10) also runs in pt-PT;
  - visual baseline for the Dashboard in pt-PT.

### Docs

`CLAUDE.md` (language rules: UI strings in `en.ts` and `pt-PT.ts`), `product.md` (language selector), `data-model.md` (`profiles.locale`), `api.md`, `testing.md` (new regression rows), `decisions.md`, `changelog.md`.
