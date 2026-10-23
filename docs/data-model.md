# Data model

> Status: **iteration 1 — implemented** (not yet deployed). The source of truth is the Drizzle schema in `apps/api/src/db/schema.ts`; this document must always match it.

## Table `sessions`

One row = one series of 25 targets.

| Column            | Type          | Rules                                                                                          |
| ----------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `id`              | `uuid`        | PK, `default gen_random_uuid()`                                                                |
| `user_id`         | `text`        | `not null`. Iteration 1: `'local'`. Iteration 2+: Neon Auth user id                            |
| `date`            | `date`        | `not null`                                                                                     |
| `discipline`      | `text`        | `not null`; allowed values in `packages/shared/src/disciplines.ts`                             |
| `score`           | `smallint`    | `not null`, `check (score between 0 and 25)`                                                   |
| `hardest_targets` | `text[]`      | `not null default '{}'`; letters `A`–`F` only; empty when the discipline has no target letters |
| `notes`           | `text`        | nullable; max 1000 characters (validated by the API)                                           |
| `import_key`      | `text`        | `unique`, nullable; set only for imported history, makes the import idempotent                 |
| `created_at`      | `timestamptz` | `not null default now()`                                                                       |
| `updated_at`      | `timestamptz` | `not null default now()`; updated on every change                                              |

Indexes: `(user_id, date)`; from iteration 3 also `(discipline, date)`.

## Table `profiles` (iteration 2+)

| Column                      | Type          | Rules                                                                                           |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `user_id`                   | `text`        | PK; Neon Auth user id                                                                           |
| `display_name`              | `text`        | `not null`; shown in the community (iteration 3)                                                |
| `avatar_url`                | `text`        | nullable; from Google                                                                           |
| `show_in_community`         | `boolean`     | `not null default false` (iteration 3, opt-in)                                                  |
| `role`                      | `text`        | `not null default 'user'`, `check (role in ('user','admin'))` (iteration 4)                     |
| `status`                    | `text`        | `not null default 'pending'`, `check (status in ('pending','active','disabled'))` (iteration 4) |
| `status_changed_at`         | `timestamptz` | nullable; set whenever the admin changes the status (iteration 4)                               |
| `created_at` / `updated_at` | `timestamptz` |                                                                                                 |

The email address is not stored here. It is read from Neon Auth's user data and exposed **only** to admins (`/api/admin/users`), never to other users.

From iteration 2, `sessions.user_id` references `profiles.user_id` with `on delete cascade`, so removing a profile removes all of its sessions (iteration 4 "Remove").

## Import of existing history

Script: `apps/api/scripts/import-csv.ts` (`pnpm db:import`), writes to the database in `DATABASE_URL`.

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

Generate with `pnpm db:generate` (Drizzle Kit; add `-- --name <description>` for a readable file name), apply with `pnpm db:migrate` (`apps/api/scripts/migrate.ts`, Drizzle migrator over the Neon HTTP driver). Tests and E2E apply the same migrations to PGlite. Stored in `apps/api/drizzle/` and committed. Production migrations must be backward compatible and applied **before** merging the code that needs them (see `README.md` → "Deploying").

| #    | Date       | Description                                                                        |
| ---- | ---------- | ---------------------------------------------------------------------------------- |
| 0000 | 2026-10-23 | `0000_create_sessions.sql`: table `sessions`, index `(user_id, date)`, score check |
