# Roadmap

| Iteration | Name                                 | Status            |
| --------- | ------------------------------------ | ----------------- |
| 1         | Core app                             | Done (2026-10-23) |
| 2         | Authentication (Google sign-in)      | Done (2026-10-23) |
| 3         | Admin (user approval and management) | Done (2026-10-23) |
| 4         | Community (leaderboards)             | Done (2026-10-25) |
| 5         | Interactive scores chart             | Done (2026-10-25) |
| 6         | Translations (English / Portuguese)  | Done (2026-10-26) |
| 7         | Clubs (proposal)                     | Planned           |
| 8         | Official and unofficial results      | Planned           |
| 9         | Freemium (paid Community)            | Planned (draft)   |

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

| Step   | State                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–7, 9 | Done (`pnpm test:all` green)                                                                                                                      |
| 8      | Done on 2026-10-23 as **one** Vercel project instead of two (decision #46, `README.md` → 4.5); in production at https://shooting-clays.vercel.app |

### Known limitations and pending work

Deployment and operations:

- **Deployed 2026-10-23** (one Vercel project, decision #46; migrations and the owner's history on Neon `main`; `PROD_URL` set, smoke tests run after each deploy). Still pending: Better Stack and Sentry (`observability.md` → "One-time setup") and the GitHub secret `SMOKE_HEARTBEAT_URL`.

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

In production since 2026-10-23: migration 0002 (Neon `dev` and `main`), account states enforced in the API, `GET /api/me`, admin endpoints, pending/disabled screens, admin screen, tests R19–R23 (R14 retired). Decisions #47–#50. Production smoke tests now start automatically after each deploy (Vercel `repository_dispatch`).

Notes:

- Neon Auth users are removed with SQL in the same statement as our rows (decision #47), so removal is one transaction.
- Admin accounts (`ADMIN_EMAILS`) cannot be disabled or removed from the admin screen, by anyone (decision #49).
- Someone who signs in with Google but never reaches the API has no profile yet and is not listed; the app calls the API right after sign-in, so in practice everyone is listed.

### Backlog ideas (not committed)

Email the admin when someone new signs up; email the user when approved; admin view of a user's statistics.

---

## Iteration 4 — Community (gamification)

Goal: a new **Community** tab that compares results across all users, per discipline, to make the app more fun.

### Periods

**Changed on 2026-10-29 (decision #71):** the Community now ranks one month only, at one club (the home club first), in one of its disciplines and optionally one field. The Day and Week periods below are gone.

- Three periods, all in Europe/Lisbon: **Day** (one calendar day), **Week** (Sunday to Saturday, decision #60) and **Month** (one calendar month).
- Default: **the current month**. The user can switch to Day or Week, and step back to previous days, weeks or months (never into the future).
- Only sessions inside the selected period and discipline count.

### Ranking rules

Each shooter's results in the period are compared **score by score, from 25 down to 0**:

1. Whoever has **more series at 25** ranks higher.
2. If that is tied, whoever has **more series at 24** ranks higher; then 23, 22, … down to 0.
3. The first score where the counts differ decides.

Example: A and B both have five 25s; A has two 24s and B has one → A ranks above B. A shooter whose best is 24 always ranks below anyone with at least one 25, however many 24s they have.

- Consequences: the best score always decides first; among equal best scores, more series at that score (and then at the next scores) win.
- **Exact tie** (the same number of series at every score) → the same rank (standard competition ranking: 1, 1, 3). Within an exact tie, whoever reached their best score **first** is listed first.
- Only shooters with at least one series in that discipline and period appear.
- The ranking is computed by one pure function in `packages/shared` (unit-tested); the API only collects each shooter's count per score.

### Screen (`/community`)

- A discipline selector and a period switcher (**Day · Week · Month**, Month selected), with previous / next arrows and the period label (e.g. "October 2026", "18–24 Oct 2026", "24 Oct 2026").
- **Podium**: the first three places as a three-step stair (2nd on the left, 1st in the middle and tallest, 3rd on the right), each with avatar, display name, rank and best score. With fewer than three shooters, the empty steps stay empty.
- From 4th place down: a plain ranked list.
- Each entry shows only: rank, avatar, display name and best score (e.g. **25**). The number of series and how many times the best score was reached only break ties; they are not shown (decisions #57, #58). The first three places are gold, silver and bronze (step colour, a ring around the photo and a small medal); shared places share the medal. The tie-break rules are only in the FAQ (`/faq#ranking`), not on the Community screen.
- The signed-in user's own entry is highlighted. If they are hidden from the community, a note says so and links to Settings.
- Empty period: "No results for this period yet."

### Settings (`/settings`)

- New screen, opened from the account menu.
- **Show me in the Community** toggle: **on by default**. Off = the user disappears from every leaderboard (their sessions still count for their own dashboard).
- **Display name** (1–50 characters): the name shown in the Community and in the header. The email address is never shown to other users.

### Privacy

- Appearing in the Community is **opt-out** (`show_in_community`, default on; decision #53, supersedes the opt-in of decision #20).
- Users who switched it off are excluded from every leaderboard response (tested).
- Only `active` accounts (iteration 3) take part: users whose account is `pending` or `disabled` are excluded from every leaderboard response (tested). Pending users do not see the Community tab.
- Responses contain no user ids or emails: only display name, avatar, the figures above, and an `isMe` flag.

### API and data

- Migration: `profiles.show_in_community boolean not null default true`; index on `sessions (discipline, date)`.
- `GET /api/community/leaderboard?discipline=…&period=day|week|month&date=YYYY-MM-DD` — `date` is any day inside the period (default: today in Europe/Lisbon). Returns the period bounds, the ranked entries and whether the signed-in user is hidden.
- `GET /api/me` also returns `showInCommunity`; `PUT /api/me/profile` accepts `displayName` and `showInCommunity`.
- Cached in the front end with a short stale time (a few minutes); changing Settings invalidates it.

### Tests

- Unit: ranking (best score first, count at the same score, next score down, the A/B example, exact ties share a rank and are ordered by who got there first); period bounds for day, week (Sunday start) and month in Europe/Lisbon, including a daylight-saving change.
- Integration: hidden users excluded; `pending` and `disabled` users excluded; one entry per user; no ids or emails in the response; only sessions in the period and discipline count.
- E2E: seeded multi-user data; podium and list order; switching period and stepping back; own entry highlighted; switching "Show me in the Community" off removes the user from the leaderboard.

### Status (2026-10-24)

Built on `feat/iteration-4-community`: migration 0003 (`profiles.show_in_community`, index `sessions (discipline, date)`), `GET /api/community/leaderboard`, `showInCommunity` in `GET /api/me` and `PUT /api/me/profile`, Community and Settings screens, tests R26–R28 (R10 now also covers Community and Settings). Decision #53.

### Known limitation

Scores are self-reported (trust-based). Shooting more series can only help (it adds counts), so volume is rewarded among equal best scores — accepted by the owner. Possible later: report/flag a result.

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

**Changed on 2026-10-29 (decision #70):** the chart no longer has its own range; it follows the Dashboard period again.

**Done early (2026-10-24, decision #51)**, as specified below: toggle buttons under the chart, tests R24 (E2E) and `ScoresChart.test.tsx`. The time range above was done on 2026-10-25 (decision #55, tests R29 and `ScoresChart.test.tsx`).

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

- In **Settings** (`/settings`, iteration 4): "Language" with two options, **English** and **Português**, each written in its own language. (Planned for the account menu; moved to Settings, which did not exist when this was written — decision #56.)
- Also on the **sign-in screen** (small switch below the button), so the choice is possible before signing in. Pending users (no Settings) choose there.
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
- `GET /api/me` returns `locale`; `PUT /api/me/profile` accepts `{ "locale": "en" | "pt-PT" }` (alone or with the other fields).

### Status (2026-10-26)

Done and in production (PR #13): migration 0004 (`profiles.locale`), `pt-PT.ts`, `useT()` / `I18nProvider`, language picker in Settings and on the sign-in screen, dates and lists per language, form and API errors translated, tests R30–R33 (R9 and R10 also in pt-PT). Decision #56.

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

---

## Iteration 7 — Clubs

Goal: clubs become accounts in the app. The admin registers each club; the club signs in and describes itself (photo, fields and the disciplines of each field), so that shooters choose from real clubs and iteration 8 can tell **official** results (recorded by a club) from **unofficial** ones (recorded by the shooter).

Already in place (decision #66): each series records the club and field where it was shot, with ids from `packages/shared/src/clubs.ts` (CCM, fields 1–4), and each user has a home club. This iteration moves that list to tables with the **same ids** (series unchanged): CCM becomes the first registered club.

### Roles

| Who     | How they get it                                   | What they can do                                                                                     |
| ------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Admin   | `ADMIN_EMAILS` (iteration 3)                      | List clubs, **add a club** (name and email), change a club's name or email, disable or remove a club |
| Club    | Registered by the admin; signs in with that email | Add or change its **photo**; manage its **fields** and the **disciplines of each field**             |
| Shooter | Every `active` user (iteration 3)                 | Unchanged: logs their own (unofficial) series, choosing club → discipline → field                    |

### Registering a club (admin)

1. Admin → **Clubs** (`/app/admin/clubs`): the list of clubs (photo, name, email, number of fields, created on) and **Add club**.
2. **Add club** asks for the **name** and the **email**. Both are fixed for the club: only the admin can change them later.
3. On saving, the API creates the club's account with a **random initial password** and emails it to the club's address (Gmail SMTP, as the contact form, decision #64), in the club's language when known, Portuguese otherwise. Text, roughly: _"Welcome to Shooting Clays. This is your initial password: … Change it after your first sign-in."_
   - The password is generated by the API, sent only in that email, and never logged or stored by the app (the auth provider keeps only its hash).
   - If the email fails, the club is still created and the admin sees **Send the password again**, which generates a new one.
4. The admin's notifications get "Club … registered" (iteration 3 notifications).

### The club's account

- Signs in with **email and password** on the same sign-in page (shooters keep **Sign in with Google**). Needs email-and-password sign-in enabled in Neon Auth, for club accounts only.
- **First sign-in**: before anything else, the club must choose a new password (the initial one stops working). "Forgot password" sends a reset link to the club's email.
- The club's screen (`/app/club`):
  - **Photo** (logo): upload, replace, remove; shown next to the club name in Add, History, Clubs, Dashboard and Community.
  - **Fields**: add a field (numbered in order: Field 1, Field 2, …), choose its disciplines (Compak Sporting, Fosso, Helice; at least one), remove a field.
  - Name and email are shown but read-only ("Only the administrator can change them").
- A club account does not log series of its own and is not listed in the Community.

### Rules

- A field that already has series cannot be removed, only **closed**: it disappears from Add, and its series keep showing it.
- Removing a discipline from a field does not change older series; new series follow the new list.
- Every check stays in the API: only the admin manages clubs; a club changes only its own photo and fields; the club–discipline–field validation of decision #66 reads the tables.

### Data (draft)

- `clubs`: `id` (text; `ccm` kept), `name`, `email` (unique), `user_id` (the club's account), `photo_url`, `status` (`active` / `disabled`), `created_at`, `updated_at`.
- `club_fields`: `club_id`, `id` (`1`, `2`, …), `disciplines` (`text[]`), `closed_at`.
- `profiles.role` gains `club`; `sessions.club_id` / `field_id` and `profiles.home_club_id` reference the new tables.

### Open questions (decide when the iteration starts)

- Where photos are stored (e.g. Vercel Blob) and their size limit.
- Can the admin remove a club that has series, or only disable it?
- Club members, managers and invitations (the earlier proposal): later, together with iteration 8 if official results need them.

### Tests

- Integration: only admins add or change clubs; name and email cannot be changed by the club; the initial password is emailed (E2E outbox) and never logged; the first sign-in requires a new password; a club changes only its own photo and fields; a field with series can only be closed; series validation follows the club's fields.
- E2E: admin adds a club → the email is in the outbox → the club signs in with it, sets a new password, adds a photo and two fields with their disciplines → a shooter sees the club and its fields in Add.

---

## Iteration 8 — Official and unofficial results

Goal: split results into **official** (recorded by a club, iteration 7) and **unofficial** (recorded by the shooter themselves, everything until now).

### Rules

- A session recorded by the shooter is **unofficial**. A session recorded by a club manager for one of the club's members is **official** and carries the club.
- Official results can be edited or deleted only by that club's managers; the shooter sees them but cannot change them. Leaving the club keeps them (still official, still the shooter's).
- Every existing session becomes unofficial (migration default).

### Filter: Unofficial · Official · All

- Dashboard, History and Community get a filter **Unofficial · Official · All**.
- Default: **Unofficial** (no clubs record results yet at the start). "All" mixes both and the ranking rules of iteration 4 apply unchanged.
- Official sessions show an **Official** badge with the club name in History and in the leaderboard.

### Club manager flow

- On `/club`, **Add official result**: pick a member, date, discipline, score, hardest targets and notes (same form as Add), or several members at once for a round shot together.

### Data and API (draft)

- `sessions.source text not null default 'self'`, `check (source in ('self','club'))`; `sessions.club_id` (nullable, set when `source = 'club'`); `sessions.recorded_by` (user id of whoever recorded it).
- `GET /api/dashboard`, `GET /api/sessions` and `GET /api/community/leaderboard` accept `source=self|club|all` (default `self`).
- `POST /api/clubs/:id/sessions` for managers; the existing `PUT`/`DELETE /api/sessions/:id` refuse official sessions for non-managers (`403`).

### Tests

- Unit: filters and statistics per source.
- Integration: a shooter cannot edit or delete an official session; a manager can only record for their own club's members; `source` filter on dashboard, history and leaderboard; default is unofficial.
- E2E: manager records an official result; the shooter sees it under Official and All but not under the default Unofficial; leaderboard switches between the three.

---

## Iteration 9 — Freemium (paid Community)

Goal: the Community becomes the **premium** part of the app. Logging series, the Dashboard and History stay free; ranking against other shooters needs a paid membership (decision #75). Draft written on 2026-10-29 from the owner's description; prices, payment provider and the user flow are to be discussed before it starts.

### Prices (aligned, not final)

- **€6 per month** or **€60 per year** (two months free).

### Settings: "Join the Community"

- The Settings switch **Show me in the Community** becomes **Join the Community** (the European Portuguese label chosen by the owner goes in `pt-PT.ts`). The new name already tells that it is something you sign up for, not only a visibility setting.
- Turning it **on** opens the **payment page** (choose monthly or yearly, then pay). Only when the payment is **valid and verified** by the API (from the payment provider, never from the browser) does the user get the Community: the page, and appearing in the rankings.
- Turning it **off** first shows a warning: from that moment the Community is closed, and joining again means **paying again**, even if part of a paid month or year is left. Confirming ends the membership at once (no refund, no remaining time kept).
- The Settings page has a Community section (with its own anchor, e.g. `/app/settings#community`) showing the state: not a member, member until …, payment pending, payment failed.

### Community icon

- The **Community** item stays in the navigation (bottom bar and menu) for everyone, but for non-members it is shown in a **premium** style: muted, with a small lock or star in the premium colour, so it reads as unavailable and paid rather than broken.
- Tapping it as a non-member opens **Settings** scrolled to the Community section, instead of the Community page.
- The Community page and `GET /api/community/leaderboard` check the membership in the API (`403 COMMUNITY_MEMBERSHIP_REQUIRED` for non-members); the UI never decides alone.

### Rules (draft)

- Membership is per user; a monthly or yearly plan renews automatically until the user leaves.
- Only members are ranked and see the rankings; leaving removes the user from the rankings at once (as "Show me in the Community" off does today).
- A failed renewal ends the membership when the paid period ends; the user sees why in Settings and in their notifications.
- Admins and club accounts (iteration 7): to decide (free, or like everyone).

### Payments: MB WAY, confirmed automatically (draft, 2026-10-29)

- The owner wants **MB WAY**. MB WAY is approved by the payer in their MB WAY app; the provider then calls our webhook, so **nobody checks payments by hand**: the API marks the membership active when the provider confirms the payment (and only then).
- Cheapest option found (published prices, October 2026; VAT added; confirm before signing): **Eupago**, MB WAY **€0.07 + 0.7%**, no monthly fee → about €0.14 on €6 and €0.60 on €60 with VAT. Stripe charges 1.5% + €0.25 for MB WAY (about €0.34 on €6) and does not support recurring MB WAY; Easypay lists 1.5% + €0.25 plus VAT. Eupago has signed webhooks (HMAC) and an API for MB WAY requests.
- Renewals: an MB WAY payment needs the payer's approval each time, so a monthly plan sends an MB WAY request every month (the member approves it on their phone); automatic renewal without approval needs MB WAY recurring authorisation, which Eupago advertises but has to be confirmed. The yearly plan needs one approval a year.
- Multibanco reference and card can be added later on the same provider.

### Admin: payments file for the tax return (IRS)

- Admin → **Payments**: choose **from** and **to** dates and download a **PDF** (and the same data as CSV for an accountant) with every payment in that range. The data comes from the API, admins only.
- One line per payment: date and time paid; member's name and, when they gave it, NIF; plan (month or year) and the period it covers; gross amount; provider fee; net amount; VAT (0 while exempt); method (MB WAY …); provider transaction id; invoice or receipt number; refunded (yes/no).
- First page, a **summary for the period**: number of payments; total received (gross), total fees, net; totals per month and per plan; refunds; and, for the selected calendar year, the total to declare as income from services.
- Tax notes to confirm with an accountant before charging: selling memberships as a person means being registered as self-employed (Category B, simplified regime) and issuing an **invoice-receipt for every payment** (Portal das Finanças, or an invoicing service with an API that the app can call after each confirmed payment, so this is automatic too); VAT exemption under article 53 of the VAT code while yearly sales stay below its limit. The file is a helper for the return, not a replacement for the invoices.

### Data (draft)

- `payments`: `id`, `user_id`, `membership_id`, `paid_at`, `amount_cents`, `fee_cents`, `vat_cents`, `method`, `provider`, `provider_transaction_id` (unique), `invoice_number`, `refunded_at`. Written only by the webhook after the provider confirms.
- `memberships`: `user_id`, `plan` (`month` / `year`), `status` (`pending` / `active` / `ended`), `provider`, `provider_customer_id`, `provider_subscription_id`, `current_period_end`, `ended_at`, `created_at`. Exactly one non-ended membership per user.
- Replaces `profiles.show_in_community`: a user is in the Community when they have an `active` membership.
- A webhook endpoint (`POST /api/payments/webhook`) receives the provider's events, verifies their signature and updates `memberships`; the payment page is the provider's checkout (no card data in the app).

### Open questions (decide when the iteration starts)

- Confirm the provider (Eupago is the cheapest found for MB WAY), whether monthly renewals can run without approving each one, and the invoicing service.
- Do current users keep the Community for free for a while (launch period), or does it close for everyone on day one?
- A free trial (e.g. 7 days)?
- What non-members see on the Community page: nothing, or a preview (e.g. the podium blurred)?
- Refunds: the rule above is "leaving ends it at once, no refund"; check that this is allowed and stated in the terms before charging.
- Terms of sale and privacy policy pages on the public site.

### Tests (draft)

- Integration: the leaderboard answers `403` without an active membership; the webhook ignores events with a bad signature; an active membership puts the user in the rankings and leaving takes them out at once; joining again needs a new payment.
- E2E (with the provider's test mode or a fake checkout in E2E mode): a non-member taps the premium Community icon → Settings, Community section → **Join the Community** → payment → Community open; leaving shows the warning and closes it.
