# REST API

> Status: **iterations 1–2 — implemented** (not yet deployed). Keep in sync with `apps/api/src/app.ts`.

- Base path: `/api` (locally `http://localhost:3000/api`)
- Format: JSON (`Content-Type: application/json`)
- Dates: `YYYY-MM-DD`; months: `YYYY-MM`; periods are computed in the **Europe/Lisbon** time zone
- Authentication (iteration 2): every endpoint except `/api/health` and `/api/health/db` requires `Authorization: Bearer <JWT>`. The JWT comes from Neon Auth (the web app gets it with `authClient.token()`, valid 15 minutes) and is verified against the branch's JWKS (`NEON_AUTH_URL/.well-known/jwks.json`, EdDSA, issuer = origin of `NEON_AUTH_URL`).
- Access (iteration 2, until iteration 3): only **verified** emails listed in `ADMIN_EMAILS` get in; everyone else gets `403 ACCESS_NOT_OPEN`. The first authenticated request creates the user's profile.
- Every query is filtered by the signed-in user's id: another user's session is reported as `404 NOT_FOUND`.

## Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "score must be between 0 and 25",
    "details": {}
  }
}
```

| HTTP | `code`             | When                                                                 |
| ---- | ------------------ | -------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Request fails schema validation                                      |
| 401  | `UNAUTHENTICATED`  | No token, or invalid/expired token                                   |
| 403  | `ACCESS_NOT_OPEN`  | (iteration 2) Email not verified or not in `ADMIN_EMAILS`            |
| 403  | `ACCOUNT_PENDING`  | (iteration 3+) Account waiting for admin approval                    |
| 403  | `ACCOUNT_DISABLED` | (iteration 3+) Account disabled by the admin                         |
| 403  | `FORBIDDEN`        | (iteration 3+) Not an admin, or an admin acting on their own account |
| 404  | `NOT_FOUND`        | Id does not exist or belongs to another user                         |
| 500  | `INTERNAL_ERROR`   | Unexpected error (details only in logs)                              |
| 503  | `UNAVAILABLE`      | Database unreachable (`/api/health/db`)                              |

## Endpoints

| Method   | Path                                  | Description                                                                                                         | Success                      |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `GET`    | `/api/health`                         | Liveness; **does not touch the database** (safe to poll often)                                                      | `200 { "ok": true }`         |
| `GET`    | `/api/health/db`                      | Runs `SELECT 1`; **poll rarely** (wakes Neon)                                                                       | `200 { "ok": true }` / `503` |
| `GET`    | `/api/disciplines`                    | Disciplines and whether they have A–F targets                                                                       | `200 Discipline[]`           |
| `GET`    | `/api/dashboard`                      | Stats per discipline × period + chart series                                                                        | `200 Dashboard`              |
| `GET`    | `/api/sessions?from=&to=&discipline=` | History                                                                                                             | `200 Session[]`              |
| `POST`   | `/api/sessions`                       | Create a session                                                                                                    | `201 { session, dashboard }` |
| `PUT`    | `/api/sessions/:id`                   | Update a session                                                                                                    | `200 { session, dashboard }` |
| `DELETE` | `/api/sessions/:id`                   | Delete a session                                                                                                    | `200 { dashboard }`          |
| `GET`    | `/api/me/profile`                     | Current user's profile (iteration 2)                                                                                | `200 Profile`                |
| `PUT`    | `/api/me/profile`                     | Update `{ "displayName" }` (1–50 characters, trimmed); community opt-in from iteration 4, `locale` from iteration 6 | `200 Profile`                |

### E2E mode only (`E2E=1`)

| Method | Path                  | Description                                                                                                                               |
| ------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/__test__/reset` | Reseeds the in-memory PGlite database from the CSV (owner `e2e-owner`). **Never registered outside E2E mode** (covered by a test)         |
| `POST` | `/api/__test__/token` | `{ id, email, name, emailVerified? }` → `{ token }`: a JWT signed with the E2E key, so browser tests sign in without Google. **E2E only** |

### Example — create a session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-10-23","discipline":"compak","score":16,"hardestTargets":["B","E"],"notes":"Field A"}'
```

Response `201` (dashboard abbreviated):

```json
{
  "session": {
    "id": "14a0a864-ecd0-4715-abc8-07b929e4079b",
    "date": "2026-10-23",
    "discipline": "compak",
    "score": 16,
    "hardestTargets": ["B", "E"],
    "notes": "Field A",
    "createdAt": "2026-10-23T15:39:42.012Z",
    "updatedAt": "2026-10-23T15:39:42.012Z"
  },
  "dashboard": { "referenceDate": "2026-10-23", "periods": { "…": "…" }, "series": { "…": "…" } }
}
```

Input rules (shared Zod schema `sessionInputSchema`): `hardestTargets` defaults to `[]` and is returned sorted and without duplicates; `notes` is trimmed and a blank value is stored as `null`.

### Example — validation error

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-10-23","discipline":"trap","score":30}'
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "score must be between 0 and 25",
    "details": { "issues": [{ "path": "score", "message": "score must be between 0 and 25" }] }
  }
}
```

`PUT` and `DELETE` on an id that does not exist (or is not a valid UUID) return `404 NOT_FOUND`.

### `Dashboard` shape

```json
{
  "referenceDate": "2026-10-23",
  "periods": {
    "allTime": { "compak": { "avg": 16, "min": 8, "max": 23, "count": 34 } },
    "lastMonth": { "compak": { "avg": 18, "min": 14, "max": 23, "count": 8 } },
    "thisMonth": { "compak": { "avg": 16, "min": 13, "max": 18, "count": 7 } }
  },
  "series": { "compak": [{ "date": "2026-04-12", "score": 8 }] }
}
```

Every discipline in `packages/shared/src/disciplines.ts` is present in every period, also when it has no sessions. `series` holds every score per discipline, oldest first; the front end filters it by period. Types: `Dashboard` in `packages/shared/src/stats.ts`.

When a discipline has no sessions in a period, `avg`, `min` and `max` are `null` and `count` is `0`; the UI shows "—".

### `Profile` shape

```json
{ "displayName": "Test Owner", "avatarUrl": null, "email": "owner@example.test" }
```

`displayName` and `avatarUrl` come from Google on the first sign-in; afterwards the user's own changes are kept. `email` comes from the token and is only ever returned to its owner.

### Example — authenticated request

```bash
curl http://localhost:3000/api/dashboard -H "Authorization: Bearer <JWT>"
```

Without the header:

```json
{ "error": { "code": "UNAUTHENTICATED", "message": "Sign in required", "details": {} } }
```

## Planned — iteration 3

| Method   | Path                       | Description                                                                           |
| -------- | -------------------------- | ------------------------------------------------------------------------------------- |
| `GET`    | `/api/me`                  | Current user: role and status (works for pending and disabled users too)              |
| `GET`    | `/api/admin/users?status=` | All users with email, status, sign-up date, session count, last activity (admin only) |
| `PATCH`  | `/api/admin/users/:userId` | `{ "status": "active" \| "disabled" }` (admin only; not on own account)               |
| `DELETE` | `/api/admin/users/:userId` | Permanently deletes the user and all their data (admin only; not on own account)      |

Rules: `roadmap.md` → Iteration 3.

## Planned — iteration 4

| Method | Path                                                   | Description                                                |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------- |
| `GET`  | `/api/community/leaderboard?month=YYYY-MM&discipline=` | Ranked list: each opted-in shooter's best score that month |
| `GET`  | `/api/community/champions?month=YYYY-MM`               | Shooter of the month per discipline                        |

Rules: `roadmap.md` → Iteration 4.
