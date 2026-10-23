# Product specification

> Status: **iteration 1 — implemented** (not yet deployed). Keep this document in sync with the implementation.

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
- Line chart of scores over time per discipline for the selected period. _(Iteration 5 gives this chart its own range selector — 3 months by default, 6 months, 1 year, all time — and a legend that shows/hides each discipline; see `roadmap.md`.)_
- Bar chart comparing averages across disciplines.

## Screens (mobile-first)

| Route          | Screen       | Content                                                                                                                                                                                                                    |
| -------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | Dashboard    | Period switcher (All time · Last month · This month), discipline cards, charts                                                                                                                                             |
| `/add`         | Add session  | Date, discipline (large buttons), score stepper 0–25, A–F checkboxes (**only** for disciplines with target letters; cleared when switching discipline), notes, **Save** → back to Dashboard                                |
| `/history`     | History      | List (newest first) with discipline filter (kept in the URL: `?discipline=`); each item shows date, discipline, score, **Hardest targets: A, C and F** (only when recorded) and notes; edit and delete (with confirmation) |
| `/history/:id` | Edit session | Same form as Add, pre-filled; **Save** → back to History with the same filter                                                                                                                                              |
| `/admin`       | Admin        | Iteration 3, admins only — see `roadmap.md`                                                                                                                                                                                |
| `/community`   | Community    | Iteration 4 — see `roadmap.md`                                                                                                                                                                                             |

UI requirements: touch targets ≥ 44 px, readable in sunlight (high contrast), one-handed use, dark mode, installable as a PWA.

## Caching behaviour (core requirement)

1. Opening the app shows the dashboard **immediately** from the persisted cache (no spinner).
2. A background `GET /api/dashboard` refreshes it silently if anything changed.
3. **Add** opens its own screen. On save, `POST /api/sessions` returns the new session **and the recalculated dashboard**; the app writes it into the cache (no second request) and goes back to the dashboard.
4. If saving fails, the form keeps its data and shows a clear error. (Offline queue: future idea, out of scope.)

Implementation details: `architecture.md`.

## Account states (iteration 3)

From iteration 3 every signed-in user is `pending`, `active` or `disabled`. Pending users see a demo dashboard with sample data, an approval banner and a disabled Add button; disabled users see an "account inactive" notice. Full rules: `roadmap.md` → Iteration 3.
