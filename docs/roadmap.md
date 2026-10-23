# Roadmap

| Iteration | Name                                 | Status          |
| --------- | ------------------------------------ | --------------- |
| 1         | Core app                             | **In progress** |
| 2         | Authentication (Google sign-in)      | Planned         |
| 3         | Community (leaderboards)             | Planned         |
| 4         | Admin (user approval and management) | Planned         |

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
- `apps/web/vercel.json` assumes the api project is served at `https://shooting-clays-api.vercel.app`. If Vercel assigns another domain, update the rewrite.
- The API "build" (`pnpm build` in `apps/api`) is a type check only; Vercel bundles `src/index.ts` itself. The Vercel build has not been tried yet.

Tests:

- **Visual regression (R9) is inactive until baselines exist.** Baselines are Linux-only: after the first push, run the "Update snapshots" workflow once on the branch. Until then, and always on macOS/Windows, R9 is skipped (`testing.md`).
- Production smoke tests (S1) need `PROD_URL`; they only run after a production deployment.

Product:

- Hardest-target counts (A–F) chart (_nice to have_ in `product.md`) is not implemented.
- No offline queue: saving without a connection fails and keeps the form filled in (out of scope, see `product.md`).
- Imported history has no hardest targets (A–F); the old free text is kept in the notes, in Portuguese (`data-model.md` → Import).
- History loads every session at once (no pagination) and the edit screen finds the session in that list. Fine for hundreds of sessions; revisit if the history grows a lot.
- The production JavaScript bundle is about 840 kB (about 250 kB gzipped) in a single file; Vite warns about chunk size. Splitting the charts (Recharts) into a separate chunk is a possible improvement.

---

## Iteration 2 — Authentication

Goal: sign in with Google; each user only sees and changes their own data.

- **Neon Auth** (managed Better Auth) with the Google provider. Development can use Neon's shared Google credentials; production uses our own Google Cloud OAuth client.
- Sign-in screen; signed-out users are redirected to it. Sign-out in a profile menu.
- A `profiles` row is created on first sign-in (see `data-model.md`).
- **Temporary safeguard until iteration 4:** only email addresses listed in `ADMIN_EMAILS` can sign in; anyone else sees "Access is not open yet". This prevents strangers from using the app before the approval flow exists. Iteration 4 replaces it with the pending/approval flow.
- API middleware validates the session (cookie or JWT — confirm the mechanism in Neon Auth docs at the start of the iteration) and sets `userId`; every query is filtered by it.
- Migration: assign all `user_id = 'local'` sessions to the owner's account (one-off, documented script).
- Tests:
  - integration: a user can never read, update or delete another user's sessions (expect 404);
  - E2E: a test-only sign-in (enabled only with `E2E=1`) so tests do not depend on Google.
- Docs: `api.md` (auth, 401), `environments.md` (auth variables), `README.md` (Google OAuth setup), `decisions.md`.

---

## Iteration 3 — Community (gamification)

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
- From iteration 4, users whose account is `pending` or `disabled` are also excluded.

### API and data

- `GET /api/community/leaderboard?month=YYYY-MM&discipline=…`
- `GET /api/community/champions?month=YYYY-MM` (shooter of the month per discipline)
- `GET /api/me/profile`, `PUT /api/me/profile` (display name, opt-in)
- Query: per user `max(score)` and earliest date at that score, then `rank() over (order by best desc)`. Index on `sessions (discipline, date)`.
- Cached in the front end with a short stale time (a few minutes).

### Tests

- Unit: ranking with ties, tie-break by earliest date, month boundaries in Europe/Lisbon.
- Integration: non-opted-in users excluded; one entry per user.
- E2E: seeded multi-user data; leaderboard order, own row pinned, month switching.

### Known limitation

Scores are self-reported (trust-based). Possible later: report/flag a result.

### Backlog ideas (not committed)

Personal-best badges, streaks (sessions in consecutive weeks), "most improved" of the month, history of past champions.

---

## Iteration 4 — Admin

Goal: the owner (admin) decides who can use the app. New users can sign in but must be approved; the admin can disable or remove accounts.

### Account states

| State       | How a user gets there                                             | What the user sees                                                                | Their data               |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| `pending`   | First Google sign-in (default for everyone not in `ADMIN_EMAILS`) | **Demo dashboard** with sample data, a clear banner and a disabled **Add** button | None yet                 |
| `active`    | Admin switches the toggle on                                      | The normal app (Dashboard, Add, History, Community)                               | Kept                     |
| `disabled`  | Admin switches the toggle off for a previously active user        | "Your account is inactive" screen; no dashboard, no Add, no History, no Community | **Kept** in the database |
| _(removed)_ | Admin clicks **Remove** and confirms                              | The account no longer exists; signing in again starts over as `pending`           | **Deleted permanently**  |

Admins: users whose email is in `ADMIN_EMAILS` get `role = 'admin'` and `status = 'active'` on sign-in. The admin email is configured only as an environment variable, never in the repository.

### Pending user experience

- A prominent banner at the top of every screen, for example: **"Your account is waiting for approval. The administrator needs to accept your request before you can log your sessions. Meanwhile, this is a preview of your dashboard with sample data."**
- The dashboard renders **sample data** from a static fixture in the front end (no API call), with a "Sample data" label on every card and chart.
- The **Add** button is visible but greyed out and disabled; tapping it shows a short explanation (tooltip/toast).
- History and Community are hidden.
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
- Leaderboards (iteration 3) only include `active` users who opted in.

### API

See `api.md` → "Planned — iteration 4".

### Tests

- Integration: pending/disabled users get 403 on every data endpoint; non-admins get 403 on `/api/admin/*`; toggling changes status; removal deletes every row for that user and nothing else; an admin cannot disable/remove themselves; disabled users are excluded from leaderboards.
- E2E: pending user sees the banner, sample data and a disabled Add button; disabled user sees the inactive notice; admin approves a user and that user then sees their real (empty) dashboard; admin removes a user after typing the name.
- E2E mode provides test-only sign-in as a pending user, an active user and an admin.

### Backlog ideas (not committed)

Email the admin when someone new signs up; email the user when approved; admin view of a user's statistics.
