# Environments and variables

## Environments

| Environment                  | Runs on                    | Database                                          | How you get there |
| ---------------------------- | -------------------------- | ------------------------------------------------- | ----------------- |
| **Local**                    | Your computer (`pnpm dev`) | Neon branch `dev`                                 | `.env`            |
| **Unit / integration tests** | Local and GitHub Actions   | PGlite (in memory)                                | `pnpm test`       |
| **E2E**                      | Local and GitHub Actions   | PGlite seeded from the CSV, fixed date 2026-10-23 | `pnpm test:e2e`   |
| **Preview**                  | Vercel, one URL per PR     | Neon branch `dev`                                 | Open a PR         |
| **Production**               | Vercel (`main`)            | Neon branch `main`                                | Merge into `main` |

## Environment variables

| Variable            | Used by      | Local (`.env`)                                           | Vercel Preview                                                                           | Vercel Production                 |
| ------------------- | ------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------- |
| `DATABASE_URL`      | api, scripts | Neon `dev` branch                                        | Neon `dev` branch                                                                        | Neon `main` branch                |
| `LOGS_SOURCE_TOKEN` | api          | empty (console only)                                     | Better Stack token                                                                       | Better Stack token                |
| `LOGS_INGEST_URL`   | api          | empty                                                    | Better Stack source ingesting host, if not the default `https://in.logs.betterstack.com` | same as Preview                   |
| `SENTRY_DSN`        | api          | empty                                                    | DSN                                                                                      | DSN                               |
| `VITE_SENTRY_DSN`   | web          | empty                                                    | DSN                                                                                      | DSN                               |
| `E2E`               | api          | `1` only inside `pnpm test:e2e`                          | **never**                                                                                | **never**                         |
| `ADMIN_EMAILS`      | api          | your email (iteration 2+)                                | your email                                                                               | your email                        |
| `APP_NOW`           | api          | `2026-10-23` only inside `pnpm test:e2e`                 | **never**                                                                                | **never** (ignored in production) |
| `PORT`              | api (local)  | optional, default `3000` (`3100` inside `pnpm test:e2e`) | not used                                                                                 | not used                          |

`.env` lives at the repository root. The local API server, `pnpm db:migrate` and `pnpm db:import` load it automatically; Vite reads `VITE_*` variables from it. `E2E` and `APP_NOW` are ignored when `VERCEL_ENV=production`.

_(Iteration 2 adds the Neon Auth / Google OAuth variables — document them here when created.)_

`ADMIN_EMAILS` is a comma-separated list. Iteration 2: only these emails can sign in. Iteration 4: these users become admins automatically. Set it only in `.env` and Vercel — **never** commit real email addresses.

## GitHub Actions secrets

| Secret                | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `PROD_URL`            | Production URL for the smoke tests                      |
| `SMOKE_HEARTBEAT_URL` | Better Stack heartbeat called when the smoke tests pass |

## Rules

- Real values never go into Git — only `.env.example` with the variable names.
- Adding a variable means updating this table, `.env.example` and `README.md`.
