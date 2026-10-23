# REST API

> Status: **iteration 1 — planned**. Update with real requests and responses as each endpoint is implemented.

- Base path: `/api` (locally `http://localhost:3000/api`)
- Format: JSON (`Content-Type: application/json`)
- Dates: `YYYY-MM-DD`; months: `YYYY-MM`; periods are computed in the **Europe/Lisbon** time zone
- Authentication: none in iteration 1; Neon Auth session from iteration 2 (every endpoint except health requires it)

## Errors

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "score must be between 0 and 25", "details": {} } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request fails schema validation |
| 401 | `UNAUTHENTICATED` | (iteration 2+) No valid session |
| 403 | `ACCOUNT_PENDING` | (iteration 4+) Account waiting for admin approval |
| 403 | `ACCOUNT_DISABLED` | (iteration 4+) Account disabled by the admin |
| 403 | `FORBIDDEN` | (iteration 4+) Not an admin, or an admin acting on their own account |
| 404 | `NOT_FOUND` | Id does not exist or belongs to another user |
| 500 | `INTERNAL_ERROR` | Unexpected error (details only in logs) |
| 503 | `UNAVAILABLE` | Database unreachable (`/api/health/db`) |

## Endpoints — iteration 1

| Method | Path | Description | Success |
|---|---|---|---|
| `GET` | `/api/health` | Liveness; **does not touch the database** (safe to poll often) | `200 { "ok": true }` |
| `GET` | `/api/health/db` | Runs `SELECT 1`; **poll rarely** (wakes Neon) | `200 { "ok": true }` / `503` |
| `GET` | `/api/disciplines` | Disciplines and whether they have A–F targets | `200 Discipline[]` |
| `GET` | `/api/dashboard` | Stats per discipline × period + chart series | `200 Dashboard` |
| `GET` | `/api/sessions?from=&to=&discipline=` | History | `200 Session[]` |
| `POST` | `/api/sessions` | Create a session | `201 { session, dashboard }` |
| `PUT` | `/api/sessions/:id` | Update a session | `200 { session, dashboard }` |
| `DELETE` | `/api/sessions/:id` | Delete a session | `200 { dashboard }` |

### E2E mode only (`E2E=1`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/__test__/reset` | Reseeds the in-memory PGlite database from the CSV. **Never registered outside E2E mode** (covered by a test) |

### Example — create a session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-10-23","discipline":"compak","score":16,"hardestTargets":["B","E"],"notes":"Field A"}'
```

### `Dashboard` shape (proposal)

```json
{
  "referenceDate": "2026-10-23",
  "periods": {
    "allTime":   { "compak": { "avg": 16, "min": 8,  "max": 23, "count": 34 } },
    "lastMonth": { "compak": { "avg": 18, "min": 14, "max": 23, "count": 8 } },
    "thisMonth": { "compak": { "avg": 16, "min": 13, "max": 18, "count": 7 } }
  },
  "series": { "compak": [{ "date": "2026-04-12", "score": 8 }] }
}
```

When a discipline has no sessions in a period, `avg`, `min` and `max` are `null` and `count` is `0`; the UI shows "—".

## Planned — iteration 2

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/me/profile` | Current user's profile |
| `PUT` | `/api/me/profile` | Update display name (and community opt-in from iteration 3) |

## Planned — iteration 3

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/community/leaderboard?month=YYYY-MM&discipline=` | Ranked list: each opted-in shooter's best score that month |
| `GET` | `/api/community/champions?month=YYYY-MM` | Shooter of the month per discipline |

Rules: `roadmap.md` → Iteration 3.

## Planned — iteration 4

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/me` | Current user: role and status (works for pending and disabled users too) |
| `GET` | `/api/admin/users?status=` | All users with email, status, sign-up date, session count, last activity (admin only) |
| `PATCH` | `/api/admin/users/:userId` | `{ "status": "active" \| "disabled" }` (admin only; not on own account) |
| `DELETE` | `/api/admin/users/:userId` | Permanently deletes the user and all their data (admin only; not on own account) |

Rules: `roadmap.md` → Iteration 4.
