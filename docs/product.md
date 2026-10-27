# Product specification

> Status: **iterations 1–6 implemented** (1–5 in production; 6 in review). Keep this document in sync with the implementation.

## Goal

Log each clay shooting series quickly at the range, and see progress per discipline straight away when opening the app (from cache, refreshed in the background).

## Disciplines

| Key        | Display name                  | Targets labelled A–F |
| ---------- | ----------------------------- | -------------------- |
| `compak`   | Compak Sporting               | Yes                  |
| `sporting` | Sporting (_Percurso de Caça_) | Yes                  |
| `fosso`    | Fosso                         | No                   |
| `trap`     | Trap                          | No                   |
| `helice`   | Helice                        | No                   |

- Defined once in `packages/shared/src/disciplines.ts` with a `hasTargetLetters` flag; easy to extend.
- `fosso` and `trap` stay separate because the history records them separately (see `decisions.md`).
- Display names come from the i18n file, not from the keys.

## Session (one series of 25 targets)

| Field            | Rules                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| `date`           | Required. Defaults to today (Europe/Lisbon)                                             |
| `discipline`     | Required, one of the keys above                                                         |
| `score`          | Required integer 0–25                                                                   |
| `hardestTargets` | Subset of `A`–`F`. Only allowed when the discipline has target letters; otherwise empty |
| `notes`          | Optional free text, max 1000 characters                                                 |

Shot load, shot size and cartridge brand are **not** recorded (not relevant for the analysis).

## Dashboard statistics

For each discipline and each period:

| Period     | Definition (Europe/Lisbon time zone) |
| ---------- | ------------------------------------ |
| All time   | Every session                        |
| Last month | Previous calendar month              |
| This month | Current calendar month               |

Metrics: **average** (rounded to the nearest integer), **min**, **max**, **number of series**. With no sessions in a period, show **"—"**, never 0.

The calculation lives in `packages/shared/src/stats.ts` and receives the reference date as a parameter (never calls `new Date()` internally), so it is deterministic and testable.

Cards are shown only for disciplines with at least one session ever (all time); in a period without sessions those cards show "—". A discipline with no history (e.g. Sporting today) gets a card after its first session.

Charts:

- Card per discipline: average highlighted, min / max, series count, small trend line.
- Line chart of scores over time per discipline, **one point per series** (two series on the same day are two points; never a same-day average, decision #60), with **its own range selector** above it: **3 months** (default) · 6 months · 1 year · All time, rolling back from today (Europe/Lisbon); the Dashboard period does not change it. "No series in this period." when the range is empty. Below it, one **toggle button per discipline** (colour key and name): all are shown by default; a tap hides that discipline's line and another tap shows it again. A hidden discipline stays in the row, greyed out with a dashed key and struck-through name. Colours and the Y axis (0–25) never change; with every discipline hidden, a hint explains how to show one; the choice lasts for the visit.
- Bar chart comparing disciplines for the selected period: each bar is the **average**; a thin whisker runs from the **lowest** to the **highest** score, and above it the average (bold) and "lowest–highest" (e.g. **16** / 8–23). A note under the chart explains the marks; the tooltip lists average, min and max.

## Screens (mobile-first)

| Route          | Screen           | Content                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _(signed out)_ | Sign in          | App name, short description, **Sign in with Google**. Every route shows it while signed out                                                                                                                                                                                                                                                                                                            |
| _(disabled)_   | Account inactive | "Your account is inactive. Contact the administrator if you think this is a mistake.", the signed-in email and **Sign out**; nothing else loads                                                                                                                                                                                                                                                        |
| `/`            | Dashboard        | Period switcher (All time · Last month · This month), then the scores-over-time chart, the averages chart and, last, the discipline cards                                                                                                                                                                                                                                                              |
| `/add`         | Add session      | Date, discipline (large buttons), score stepper 0–25, A–F checkboxes (**only** for disciplines with target letters; cleared when switching discipline), notes, **Save** → back to Dashboard                                                                                                                                                                                                            |
| `/history`     | History          | List (newest first) with discipline filter (kept in the URL: `?discipline=`); each item shows date, discipline, score, **Hardest targets: A, C and F** (only when recorded) and notes; edit and delete (with confirmation)                                                                                                                                                                             |
| `/history/:id` | Edit session     | Same form as Add, pre-filled; **Save** → back to History with the same filter                                                                                                                                                                                                                                                                                                                          |
| `/admin`       | Admin            | Admins only: search by name or email and filters **All · Active · Pending** with counts (kept in the URL: `?q=`, `?status=`; disabled accounts only under All); user list (pending first) with email, sign-up date, sessions, last activity; the switch shows the status (on = active, no status text); approve/disable (with undo); **Remove** after typing the name. Admin accounts have no controls |
| `/community`   | Community        | Iteration 4 — leaderboard per discipline for a day, week or month (month by default), podium for the top three, then a list; see `roadmap.md`                                                                                                                                                                                                                                                          |
| `/settings`    | Settings         | Display name, **Show me in the Community** (on by default) and **Language** (English · Português). Admins also get **Clear cache and reload**: forgets what the app keeps on this device (cached data, app files, service worker) and loads the latest version                                                                                                                                         |
| `/faq`         | FAQ              | Frequently asked questions as collapsible sections (`/faq#ranking` opens that one; the Community has no link to it): Community ranking and tie-breaks, periods, who appears in the Community, pending accounts, hardest targets, language. Public: also reachable from the sign-in screen                                                                                                              |

Every signed-in screen has a header with **"Welcome, <first name>"**. Navigation depends on the screen width (decision #57):

- **Desktop (1024 px and wider):** a bottom bar with the pages (Dashboard, Add, History, Community, Admin) and, in the header, an account button (Google photo, or the name's initial) that opens a menu with the email, **Settings**, **FAQ** and **Sign out**.
- **Phones and tablets (narrower than 1024 px):** no bottom bar and no account button; a **Menu** button in the header opens a panel with the photo, name and email, every page, then **Settings**, **FAQ** and **Sign out**. It closes when a page is chosen, on a tap outside it or with Esc.

Admins also get **Admin** with a badge counting the accounts waiting for approval (on phones and tablets the badge is also on the Menu button). Everywhere a person is shown (header, menu, Community, Admin) the circle has their Google photo, read from Neon Auth, and only shows the name's initial when there is no photo.

UI requirements: touch targets ≥ 44 px, readable in sunlight (high contrast), one-handed use, dark mode, installable as a PWA.

## Caching behaviour (core requirement)

1. Opening the app shows the dashboard **immediately** from the persisted cache (no spinner).
2. A background `GET /api/dashboard` refreshes it silently if anything changed.
3. **Add** opens its own screen. On save, `POST /api/sessions` returns the new session **and the recalculated dashboard**; the app writes it into the cache (no second request) and goes back to the dashboard.
4. If saving fails, the form keeps its data and shows a clear error. (Offline queue: future idea, out of scope.)

Implementation details: `architecture.md`.

## Language (iteration 6)

The user can switch the interface between English and European Portuguese (**Settings** and the sign-in screen). The first visit follows the browser; the choice applies immediately and is saved on the device and in the profile. Full rules: `roadmap.md` → Iteration 6.

## Account states (iteration 3)

Every signed-in user is `pending`, `active` or `disabled`; admins (`ADMIN_EMAILS`) are always active.

- **Pending** (new account): approval banner on every screen, the dashboard with **sample data** built in the app (each card and chart labelled "Sample data"; no API call), **Add** visible but disabled (tapping explains why), no History.
- **Disabled:** only the "account inactive" notice and Sign out; cached data is dropped from the device.
- The app re-checks the account when it opens and when it regains focus, so approval applies without signing out.

Full rules: `roadmap.md` → Iteration 3.
