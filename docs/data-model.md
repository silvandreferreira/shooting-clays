# Data model

> Status: **iterations 1–3 — implemented and in production**. The source of truth is the Drizzle schema in `apps/api/src/db/schema.ts`; this document must always match it.

## Table `sessions`

One row = one series of 25 targets.

| Column            | Type          | Rules                                                                                                                                                                  |
| ----------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `uuid`        | PK, `default gen_random_uuid()`                                                                                                                                        |
| `user_id`         | `text`        | `not null`, references `profiles.user_id` (`on delete cascade`). Neon Auth user id; `'local'` for sessions logged before iteration 2 until `pnpm db:assign-owner` runs |
| `date`            | `date`        | `not null`                                                                                                                                                             |
| `discipline`      | `text`        | `not null`; allowed values in `packages/shared/src/disciplines.ts`                                                                                                     |
| `score`           | `smallint`    | `not null`, `check (score between 0 and 25)`                                                                                                                           |
| `hardest_targets` | `text[]`      | `not null default '{}'`; letters `A`–`F` only; empty when the discipline has no target letters                                                                         |
| `notes`           | `text`        | nullable; max 1000 characters (validated by the API)                                                                                                                   |
| `import_key`      | `text`        | `unique`, nullable; set only for imported history, makes the import idempotent                                                                                         |
| `created_at`      | `timestamptz` | `not null default now()`                                                                                                                                               |
| `updated_at`      | `timestamptz` | `not null default now()`; updated on every change                                                                                                                      |

Indexes: `(user_id, date)` and `(discipline, date)` (migration 0003, for the Community leaderboards).

## Table `profiles` (iteration 2+)

| Column                      | Type          | Rules                                                                                           |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `user_id`                   | `text`        | PK; Neon Auth user id                                                                           |
| `display_name`              | `text`        | `not null`; shown in the community (iteration 4)                                                |
| `avatar_url`                | `text`        | nullable; from Google                                                                           |
| `show_in_community`         | `boolean`     | `not null default true` (iteration 4, opt-out in Settings; decision #53)                        |
| `role`                      | `text`        | `not null default 'user'`, `check (role in ('user','admin'))` (iteration 3)                     |
| `status`                    | `text`        | `not null default 'pending'`, `check (status in ('pending','active','disabled'))` (iteration 3) |
| `status_changed_at`         | `timestamptz` | nullable; set whenever the admin changes the status (iteration 3)                               |
| `locale`                    | `text`        | nullable, `check (locale in ('en','pt-PT'))`; `null` = follow the browser (iteration 6)         |
| `created_at` / `updated_at` | `timestamptz` |                                                                                                 |

The email address is not stored here. It is read from Neon Auth's user data and exposed **only** to admins (`/api/admin/users`), never to other users.

Implemented so far: `user_id`, `display_name`, `avatar_url`, `show_in_community` (migration 0003), `role`, `status`, `status_changed_at`, `created_at`, `updated_at`; the other columns arrive with their iterations. A profile is created on the user's first authenticated API request (name and photo from Google, `pending`); later changes by the user are never overwritten. Verified emails in `ADMIN_EMAILS` are set to `admin` / `active` on every request.

`sessions.user_id` references `profiles.user_id` with `on delete cascade`, so removing a profile removes all of its sessions.

### Removing a user (iteration 3)

One SQL statement (so one transaction) in `apps/api/src/admin-repo.ts`: delete the profile (its sessions go by cascade) and the user's row in `neon_auth."user"` (Neon Auth's own foreign keys then delete their sessions and linked Google account). Admin profiles are never removed. Tests and E2E run the same statement on PGlite with a stand-in `neon_auth."user"` table (`apps/api/src/db/memory.ts`).

### Sessions from before sign-in existed (`'local'`)

Migration `0001` gives existing `'local'` sessions a placeholder profile (`user_id = 'local'`) so the foreign key holds. After the owner (first address in `ADMIN_EMAILS`) has signed in once in that environment, `pnpm db:assign-owner` moves those sessions to the owner and deletes the placeholder. Re-running it changes nothing. Done on the Neon `dev` branch on 2026-10-23 (48 sessions).

## Import of existing history

Script: `apps/api/scripts/import-csv.ts` (`pnpm db:import`), writes to the database in `DATABASE_URL`, **for the owner** (first address in `ADMIN_EMAILS`), who must have signed in once in that environment.

Source: `data/clays-results.csv` — columns `Data, Modalidade, Resultado X/25, Gramas, Chumbo, Marca, Observações, Pratos mais exigentes`; dates like `26-Sep-2026`; some quoted fields contain line breaks (use a real CSV parser).

| CSV column                              | Target                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Data`                                  | `date`                                                                                       |
| `Modalidade`                            | `discipline` (`Compak` → `compak`, `Fosso` → `fosso`, `Trap` → `trap`, `Helices` → `helice`) |
| `Resultado X/25`                        | `score`                                                                                      |
| `Observações` + `Pratos mais exigentes` | `notes` (joined; `N/A` and empty values ignored; kept in the original language)              |
| `Gramas`, `Chumbo`, `Marca`             | ignored                                                                                      |

- `hardest_targets` stays empty for imported rows (the old free text cannot be converted reliably).
- `import_key` = hash of date + discipline + score + CSV row index; inserts use `ON CONFLICT DO NOTHING`, so the import can be re-run safely.

## Migrations

Generate with `pnpm db:generate` (Drizzle Kit; add `--name <description>` for a readable file name, e.g. `pnpm db:generate --name account_states`), apply with `pnpm db:migrate` (`apps/api/scripts/migrate.ts`, Drizzle migrator over the Neon HTTP driver). Tests and E2E apply the same migrations to PGlite. Stored in `apps/api/drizzle/` and committed. Production migrations must be backward compatible and applied **before** merging the code that needs them (see `README.md` → "Deploying").

| #    | Date       | Description                                                                                                                                                                                                                        |
| ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0000 | 2026-10-23 | `0000_create_sessions.sql`: table `sessions`, index `(user_id, date)`, score check                                                                                                                                                 |
| 0001 | 2026-10-23 | `0001_create_profiles.sql`: table `profiles`; placeholder profile for `'local'` sessions; FK `sessions.user_id → profiles.user_id` (cascade)                                                                                       |
| 0002 | 2026-10-23 | `0002_account_states.sql`: `profiles.role` (default `user`), `status` (default `pending`), `status_changed_at`, with checks. Existing profiles become `pending` until their next request (admins are promoted from `ADMIN_EMAILS`) |
