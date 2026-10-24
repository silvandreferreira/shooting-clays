# Roadmap

| Iteration | Name                                 | Status                                           |
| --------- | ------------------------------------ | ------------------------------------------------ |
| 1         | Core app                             | Done (2026-10-23)                                |
| 2         | Authentication (Google sign-in)      | Done (2026-10-23)                                |
| 3         | Admin (user approval and management) | Done (2026-10-23)                                |
| 4         | Community (leaderboards)             | **In progress**                                  |
| 5         | Interactive scores chart             | **In progress** (legend toggles done 2026-10-24) |
| 6         | Translations (English / Portuguese)  | Planned                                          |
| 7         | Clubs (proposal)                     | Planned                                          |
| 8         | Official and unofficial results      | Planned                                          |

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

- Three periods, all in Europe/Lisbon: **Day** (one calendar day), **Week** (Monday to Sunday) and **Month** (one calendar month).
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

- Discipline tabs and a period switcher (**Day · Week · Month**, Month selected), with previous / next arrows and the period label (e.g. "October 2026", "20–26 Oct 2026", "24 Oct 2026").
- **Podium**: the first three places as a three-step stair (2nd on the left, 1st in the middle and tallest, 3rd on the right), each with avatar, display name, rank and best score. With fewer than three shooters, the empty steps stay empty.
- From 4th place down: a plain ranked list.
- Each entry shows: rank, avatar, display name, best score with how many times it was reached (e.g. **25 ×5**) and the number of series in the period.
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

- Unit: ranking (best score first, count at the same score, next score down, the A/B example, exact ties share a rank and are ordered by who got there first); period bounds for day, week (Monday start) and month in Europe/Lisbon, including a daylight-saving change.
- Integration: hidden users excluded; `pending` and `disabled` users excluded; one entry per user; no ids or emails in the response; only sessions in the period and discipline count.
- E2E: seeded multi-user data; podium and list order; switching period and stepping back; own entry highlighted; switching "Show me in the Community" off removes the user from the leaderboard.

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

**Done early (2026-10-24, decision #51)**, as specified below: toggle buttons under the chart, tests R24 (E2E) and `ScoresChart.test.tsx`. The time range above is still to do.

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

---

## Iteration 7 — Clubs (proposal)

Goal: let shooting clubs exist in the app, with their own managers and members, so that iteration 8 can tell **official** results (recorded by a club) from **unofficial** ones (recorded by the shooter). This section is a proposal: confirm the open questions at the start of the iteration.

### Roles

| Who          | How they get it                                           | What they can do                                                                             |
| ------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Admin        | `ADMIN_EMAILS` (iteration 3)                              | Create, rename and delete clubs; choose each club's managers                                 |
| Club manager | Chosen by the admin among `active` users                  | Manage their club's members (add, invite, remove); from iteration 8, record official results |
| Member       | Added or invited by a club manager                        | Belongs to **one** club at a time; sees the club name on their profile; can leave the club   |
| Shooter      | Every `active` user (iteration 3), with or without a club | Unchanged: logs their own (unofficial) sessions                                              |

A club manager is usually also a member of the same club, but does not have to be.

### Adding shooters to a club

Two ways, both from the club screen:

1. **Pick from the app**: a list of `active` shooters who are **not in any club yet** (avatar and display name only, never the email), with a search box. The manager ticks one or more shooters → each receives a **join request** in the app (banner + Settings) and becomes a member when they accept. Nobody joins a club without agreeing.
2. **Invite someone new**: the manager types the shooter's name → the app creates a **member placeholder** with that name and a personal **invite link** (single use, expires after 14 days, can be renewed). The manager shares the link (phone share sheet, WhatsApp, email…). The shooter opens it, lands on the sign-in page, signs in with Google, and accepts → their account is linked to the placeholder and they become a member.
   - An account created from a club invitation starts `active` (the club vouches for the shooter), so it skips the admin approval of iteration 3. The admin can still disable it.
   - If the person already has an account, signing in with the link simply adds the club membership (after accepting).

Members can **leave** the club from Settings; managers can **remove** members. Leaving or being removed never deletes sessions.

### Screens

- `/club` (club managers): members list (name, avatar, joined date, pending invites/requests with "Copy link" and "Cancel"), **Add from app**, **Invite new shooter**, **Remove**.
- Admin screen: new **Clubs** section (create, rename, delete, choose managers).
- Settings: "Club: <name>" with **Leave club**, and any pending join request with **Accept** / **Decline**.
- Community and History show the club name next to a member's name.

### Data (draft)

- `clubs`: `id`, `name` (unique), `created_at`, `updated_at`.
- `club_members`: `club_id`, `user_id` (nullable while it is a placeholder), `display_name` (for placeholders), `role` (`manager` / `member`), `status` (`invited` / `requested` / `active`), `joined_at`; unique `user_id` among active members (one club per shooter).
- `club_invites`: `id`, `club_member_id`, token hash (the token itself is never stored), `expires_at`, `used_at`.

### Open questions (decide when the iteration starts)

- Can a club manager also **create** a club, or only the admin?
- Can a shooter ever belong to more than one club (e.g. a federation and a local club)? Proposal: no, one club.
- Should a club be able to see its members' unofficial results? Proposal: no, only the official results it recorded (iteration 8).

### Tests

- Integration: only admins manage clubs; only a club's managers manage its members; a shooter cannot be in two clubs; a join request or invite does nothing until accepted; invite tokens are single-use and expire; the list of shooters without a club never contains emails, `pending` or `disabled` users.
- E2E: admin creates a club and a manager; manager adds a shooter from the app and the shooter accepts; manager invites a new shooter, who signs in through the link and lands active in the club; member leaves the club.

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
