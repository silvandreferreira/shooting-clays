# REST API

> Status: **iterations 1–3 — implemented and in production**. Keep in sync with `apps/api/src/app.ts`.

- Base path: `/api` (locally `http://localhost:3000/api`)
- Format: JSON (`Content-Type: application/json`)
- Dates: `YYYY-MM-DD`; months: `YYYY-MM`; periods are computed in the **Europe/Lisbon** time zone
- Authentication (iteration 2): every endpoint except `/api/health` and `/api/health/db` requires `Authorization: Bearer <JWT>`. The JWT comes from Neon Auth (the web app gets it with `authClient.token()`, valid 15 minutes) and is verified against the branch's JWKS (`NEON_AUTH_URL/.well-known/jwks.json`, EdDSA, issuer = origin of `NEON_AUTH_URL`).
- Accounts (iteration 3): the first authenticated request creates the user's profile as `pending`. Every request reads the profile, so status changes apply at once:
  - `pending` → `403 ACCOUNT_PENDING` and `disabled` → `403 ACCOUNT_DISABLED` on every endpoint except `GET /api/me`;
  - **verified** emails in `ADMIN_EMAILS` are always `role = 'admin'`, `status = 'active'`;
  - a valid token whose user no longer exists in Neon Auth (removed by the admin) gets `401`, so no new profile is created for it.
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

| HTTP | `code`             | When                                                                                                       |
| ---- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Request fails schema validation                                                                            |
| 401  | `UNAUTHENTICATED`  | No token, or invalid/expired token                                                                         |
| 403  | `ACCOUNT_PENDING`  | Account waiting for admin approval                                                                         |
| 403  | `ACCOUNT_DISABLED` | Account disabled by the admin                                                                              |
| 403  | `FORBIDDEN`        | Not an admin, or an admin acting on an admin account (their own too)                                       |
| 404  | `NOT_FOUND`        | Id does not exist or belongs to another user                                                               |
| 429  | `RATE_LIMITED`     | Too many contact form messages (`/api/contact`)                                                            |
| 500  | `INTERNAL_ERROR`   | Unexpected error (details only in logs)                                                                    |
| 503  | `UNAVAILABLE`      | Database unreachable (`/api/health/db`); contact form without SMTP settings or the email could not be sent |

## Endpoints

| Method   | Path                                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                 | Success                      |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `GET`    | `/api/health`                                          | Liveness; **does not touch the database** (safe to poll often)                                                                                                                                                                                                                                                                                                                                                                              | `200 { "ok": true }`         |
| `GET`    | `/api/health/db`                                       | Runs `SELECT 1`; **poll rarely** (wakes Neon)                                                                                                                                                                                                                                                                                                                                                                                               | `200 { "ok": true }` / `503` |
| `POST`   | `/api/contact`                                         | **Public** (no sign-in). The public site's contact form: `{ "name", "email", "message", "locale", "website"? }` (name 1–100 characters, message 10–5000, both trimmed; `locale` = `en` or `pt-PT`). Emailed to `CONTACT_TO_EMAIL` with reply-to the sender; never logged. `website` is a honeypot: when filled in, the answer is the same and nothing is sent. 5 messages an hour per sender and 50 in total, per function instance (`429`) | `200 { "ok": true }`         |
| `GET`    | `/api/disciplines`                                     | Disciplines and whether they have A–F targets                                                                                                                                                                                                                                                                                                                                                                                               | `200 Discipline[]`           |
| `GET`    | `/api/dashboard`                                       | Stats per discipline × period + chart series                                                                                                                                                                                                                                                                                                                                                                                                | `200 Dashboard`              |
| `GET`    | `/api/sessions?from=&to=&discipline=`                  | History                                                                                                                                                                                                                                                                                                                                                                                                                                     | `200 Session[]`              |
| `POST`   | `/api/sessions`                                        | Create a session                                                                                                                                                                                                                                                                                                                                                                                                                            | `201 { session, dashboard }` |
| `PUT`    | `/api/sessions/:id`                                    | Update a session                                                                                                                                                                                                                                                                                                                                                                                                                            | `200 { session, dashboard }` |
| `DELETE` | `/api/sessions/:id`                                    | Delete a session                                                                                                                                                                                                                                                                                                                                                                                                                            | `200 { dashboard }`          |
| `GET`    | `/api/me`                                              | Current user: profile, role and status. **Works for pending and disabled users**                                                                                                                                                                                                                                                                                                                                                            | `200 Me`                     |
| `PUT`    | `/api/me/profile`                                      | Update `{ "displayName"?, "showInCommunity"?, "locale"? }` (name 1–50 characters, trimmed; `locale` = `en` or `pt-PT`; at least one field)                                                                                                                                                                                                                                                                                                  | `200 Me`                     |
| `GET`    | `/api/community/leaderboard?discipline=&period=&date=` | Ranked shooters for one discipline and period: `period` = `day` / `week` / `month` (default `month`), `date` = any day in it (default today, Europe/Lisbon). Only active users with `showInCommunity`; no ids or emails                                                                                                                                                                                                                     | `200 Leaderboard`            |
| `GET`    | `/api/admin/users`                                     | All users, pending first, then newest sign-up first (admin only)                                                                                                                                                                                                                                                                                                                                                                            | `200 AdminUser[]`            |
| `PATCH`  | `/api/admin/users/:userId`                             | `{ "status": "active" \| "disabled" \| "pending" }` (admin only; `pending` is for undo)                                                                                                                                                                                                                                                                                                                                                     | `200 { userId, status }`     |
| `DELETE` | `/api/admin/users/:userId`                             | Permanently deletes the user and all their data, Neon Auth included (admin only)                                                                                                                                                                                                                                                                                                                                                            | `200 { removed: true }`      |

### E2E mode only (`E2E=1`)

| Method | Path                   | Description                                                                                                                                                                                                                           |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/__test__/reset`  | Reseeds the in-memory PGlite database from the CSV (owner `e2e-owner`). **Never registered outside E2E mode** (covered by a test)                                                                                                     |
| `GET`  | `/api/__test__/outbox` | Contact form messages since the last reset (the E2E API never sends email). **E2E only**                                                                                                                                              |
| `POST` | `/api/__test__/token`  | `{ id, email, name, emailVerified?, status? }` → `{ token }`: records the user in the fake `neon_auth."user"` (as Google sign-in would), gives a new profile `status` if set, and returns a JWT signed with the E2E key. **E2E only** |

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

### `Me` shape

```json
{
  "displayName": "Test Owner",
  "avatarUrl": null,
  "email": "owner@example.test",
  "role": "admin",
  "status": "active"
}
```

`displayName` and `avatarUrl` come from Google on the first sign-in; afterwards the user's own changes are kept. In the Community leaderboard and the Admin list, `avatarUrl` is the current Google photo from Neon Auth (`neon_auth."user".image`), or the stored one when Neon Auth has none. `email` comes from the token and is only ever returned to its owner. Types: `Me`, `AdminUser` in `packages/shared/src/schemas.ts`.

### `AdminUser` shape

```json
{
  "userId": "6a8b4c38-2103-44f0-911f-1e378645f82a",
  "displayName": "Pat New",
  "avatarUrl": null,
  "email": "pat@example.test",
  "role": "user",
  "status": "pending",
  "signedUpAt": "2026-10-23T21:06:07.000Z",
  "sessionCount": 0,
  "lastActivityAt": null
}
```

`email` and `signedUpAt` come from Neon Auth (`neon_auth."user"`); `lastActivityAt` is the latest change to any of the user's sessions. Admin accounts are listed but cannot be changed or removed (`ADMIN_EMAILS` decides them). Status changes log `{ action: "user_status_changed", adminId, status }`; removals log only `{ action: "user_removed", adminId, at }`.

### Example — authenticated request

```bash
curl http://localhost:3000/api/dashboard -H "Authorization: Bearer <JWT>"
```

Without the header:

```json
{ "error": { "code": "UNAUTHENTICATED", "message": "Sign in required", "details": {} } }
```
