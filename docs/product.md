# Product specification

> Status: **iterations 1–6 implemented** (1–5 in production; 6 in review). Keep this document in sync with the implementation.

## Goal

Log each clay shooting series quickly at the range, and see progress per discipline straight away when opening the app (from cache, refreshed in the background).

## Disciplines

The app records and shows **three** disciplines (decision #68):

| Key      | Display name    | Hardest targets A–F |
| -------- | --------------- | ------------------- |
| `compak` | Compak Sporting | Yes (decision #67)  |
| `fosso`  | Fosso           | No                  |
| `helice` | Helice          | No                  |

- Defined once in `packages/shared/src/disciplines.ts` (`DISCIPLINE_KEYS`, with a `hasTargetLetters` flag); the database only accepts these keys.
- The public site's Disciplines page still describes five: also Sporting (_Percurso de Caça_) and Trap (`SITE_DISCIPLINE_KEYS`). The owner's 3 Trap series were converted to Fosso; series in any other discipline are deleted.
- Display names come from the i18n file, not from the keys.

## Session (one series of 25 targets)

| Field            | Rules                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date`           | Required. Defaults to today (Europe/Lisbon)                                                                                                                     |
| `discipline`     | Required, one of the keys above                                                                                                                                 |
| `score`          | Required integer 0–25                                                                                                                                           |
| `clubId`         | The club where it was shot (see Clubs below). Required for a new series                                                                                         |
| `fieldId`        | A field of that club that has the discipline. Required for a new series; an edit may leave it (or club and field) empty, for series logged before clubs existed |
| `hardestTargets` | Subset of `A`–`F`. Only allowed in Compak Sporting; otherwise empty                                                                                             |
| `notes`          | Optional free text, max 1000 characters                                                                                                                         |

## Clubs and fields (decision #66)

A club has numbered fields, each with the disciplines shot there. The list is `packages/shared/src/clubs.ts` (served by `GET /api/clubs`) until iteration 7 moves it to the database with the same ids:

| Club | Field 1                        | Field 2                | Field 3         | Field 4         |
| ---- | ------------------------------ | ---------------------- | --------------- | --------------- |
| CCM  | Compak Sporting, Fosso, Helice | Compak Sporting, Fosso | Compak Sporting | Compak Sporting |

The order of choice is **club → discipline → field**: the disciplines offered are the club's, then only the fields that have the chosen discipline (when only one does, it is chosen). The imported history is at CCM, without a field.

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

Cards are shown only for disciplines with at least one session ever (all time); in a period without sessions those cards show "—". A discipline with no history gets a card after its first session.

Charts:

- Card per discipline: average highlighted, min / max, series count, small trend line.
- Line chart of scores over time per discipline, **one point per series** (two series on the same day are two points; never a same-day average, decision #60), with **its own range selector** above it: **3 months** (default) · 6 months · 1 year · All time, rolling back from today (Europe/Lisbon); the Dashboard period does not change it. "No series in this period." when the range is empty. Below it, one **toggle button per discipline** (colour key and name): all are shown by default; a tap hides that discipline's line and another tap shows it again. A hidden discipline stays in the row, greyed out with a dashed key and struck-through name. Colours and the Y axis (0–25) never change; with every discipline hidden, a hint explains how to show one; the choice lasts for the visit.
- Bar chart comparing disciplines for the selected period: each bar is the **average**; a thin whisker runs from the **lowest** to the **highest** score, and above it the average (bold) and "lowest–highest" (e.g. **16** / 8–23). A note under the chart explains the marks; the tooltip lists average, min and max.

## Public site (decision #62)

Visitors who are not signed in find the product through search engines, so the public pages explain it before anyone signs in. They are in European Portuguese at the root and in English under `/en` (`architecture.md` → Public site); the app lives under `/app`.

- **Home** (`/`, `/en`): what Shooting Clays is for — log every series, see the progress, and a **competitive but friendly** Community ("if someone shot 18, try for 19"), not an official competition; how it works in three steps; the five disciplines; three FAQ questions; **Start for free** and **Sign in** go to `/app`. A screenshot of the Dashboard in the page's language.
- **Disciplines** (`/modalidades`, `/en/disciplines`): one section per discipline (what it is, stations, machines, shots per target, targets per series, maximum load and shot size, a training tip) and a comparison table. Loads and shot sizes come from the FPTAC table "Munições reconhecidas" (exam manual for the federation licence E, version 2.1, August 2026), cited with a link under the table: Compak Sporting and Sporting 28 g (+2% FITASC), 2.0–2.5 mm; Fosso (Olympic trap) 24 g (+0.5 g ISSF), up to 2.6 mm; Trap 28 g, FPTAC standard; Helice 28 g (+2% FITASC), up to 2.5 mm. Our own text; rules vary between clubs, so it points to the official rules for competitions.
- **FAQ** (`/faq`, `/en/faq`): every FAQ question.
- **Contact** (`/contactos`, `/en/contact`): name, email and message (at least 10 characters); the message reaches the admins' notifications and the owner's email, and the answer goes back by email. Fields are checked before sending, in the page's language. Spam: a hidden honeypot field and a limit of 5 messages an hour per sender (decision #64).
- Header (logo, Disciplines, FAQ, Contact, **Sign in**) and footer (pages, the other language, "not affiliated with any federation or club") on every page; a 404 page for anything else.

## Screens (mobile-first)

| Route                | Screen           | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(signed out)_       | Sign in          | App name, short description, **Sign in with Google**, language picker, links to the public home page and FAQ. Every `/app` route shows it while signed out                                                                                                                                                                                                                                                                                                                                                                                |
| _(disabled)_         | Account inactive | "Your account is inactive. Contact the administrator if you think this is a mistake.", the signed-in email and **Sign out**; nothing else loads                                                                                                                                                                                                                                                                                                                                                                                           |
| `/app`               | Dashboard        | Period switcher (All time · Last month · This month), then the scores-over-time chart, the averages chart and, last, the discipline cards                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/app/add`           | Add session      | Date, club (the home club, or the first one), discipline (large buttons, the club's), field (only those with the discipline; required), score stepper 0–25, A–F checkboxes (**only** Compak Sporting; cleared when switching discipline), notes, **Save** → back to Dashboard                                                                                                                                                                                                                                                             |
| `/app/history`       | History          | List (newest first) with discipline filter (kept in the URL: `?discipline=`); each item shows date, discipline, where (**CCM · Field 2**, or only the club without a field), score, **Hardest targets: A, C and F** (only when recorded) and notes; edit and delete (with confirmation)                                                                                                                                                                                                                                                   |
| `/app/history/:id`   | Edit session     | Same form as Add, pre-filled, where **No club** and **No field** can also be chosen; **Save** → back to History with the same filter                                                                                                                                                                                                                                                                                                                                                                                                      |
| `/app/admin`         | Admin            | Admins only: search by name or email and filters **All · Active · Pending** with counts (kept in the URL: `?q=`, `?status=`; disabled accounts only under All); user list (pending first) with email, sign-up date, sessions, last activity; the switch shows the status (on = active, no status text); approve/disable (with undo); **Remove** revokes the access with a message (pre-filled, editable) after typing the name; a revoked account shows "Revoked: waiting to be read" and **Delete now**. Admin accounts have no controls |
| `/app/community`     | Community        | Iteration 4 — leaderboard per discipline for a day, week or month (month by default), podium for the top three, then a list; see `roadmap.md`                                                                                                                                                                                                                                                                                                                                                                                             |
| `/app/notifications` | Notifications    | Newest first; unread ones highlighted with **Mark as read** (pt-PT **Li**). Users: sign-up received, account active. Admins: a new account waiting (link to Admin filtered on Pending), contact form messages (name, email, message, **Reply by email**). The **bell** in the header counts the unread ones (checked when the app opens, regains focus and every minute)                                                                                                                                                                  |
| `/app/clubs`         | Clubs            | Each club with its fields and their disciplines; **Make home club** (the home club is marked **Home club**)                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/app/settings`      | Settings         | Display name, **My club** (from the list of clubs; the first one until chosen), **Show me in the Community** (on by default) and **Language** (English · Português). Admins also get **Clear cache and reload**: forgets what the app keeps on this device (cached data, app files, service worker) and loads the latest version                                                                                                                                                                                                          |
| `/app/faq`           | FAQ              | Frequently asked questions as collapsible sections (`#ranking` opens that one; the Community has no link to it): Community ranking and tie-breaks, periods, who appears in the Community, pending accounts, hardest targets, installing the app on a phone, updates, language. The same questions are on the public FAQ                                                                                                                                                                                                                   |

Every signed-in screen has a header with **"Welcome, <first name>"**. Navigation depends on the screen width (decision #57):

- **Desktop (1024 px and wider):** a bottom bar with the pages (Dashboard, Add, History, Community, Admin) and, in the header, an account button (Google photo, or the name's initial) that opens a menu with the email, **Settings**, **Clubs**, **FAQ** and **Sign out**.
- **Phones and tablets (narrower than 1024 px):** no bottom bar and no account button; a **Menu** button in the header opens a panel with the photo, name and email, every page, then **Settings**, **Clubs**, **FAQ** and **Sign out**. It closes when a page is chosen, on a tap outside it or with Esc.

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

Every signed-in user is `pending`, `active`, `disabled` or `revoked`; admins (`ADMIN_EMAILS`) are always active.

- **Pending** (new account): approval banner on every screen, the dashboard with **sample data** built in the app (each card and chart labelled "Sample data"; no API call), **Add** visible but disabled (tapping explains why), no History.
- **Disabled:** only the "account inactive" notice and Sign out; cached data is dropped from the device.
- **Revoked** (decision #65): the admin removed the user with a message. Their sessions are deleted at once; the app shows only the message and **Mark as read**. Reading it deletes the account, signs out and opens the public home page. Signing in again starts over as pending.
- Pending users also see their **notifications** (the bell and `/app/notifications`).
- The app re-checks the account when it opens and when it regains focus, so approval applies without signing out.

Full rules: `roadmap.md` → Iteration 3.
