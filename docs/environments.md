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

| Variable            | Used by                   | Local (`.env`)                                           | Vercel Preview                                                                           | Vercel Production                  |
| ------------------- | ------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| `DATABASE_URL`      | api, scripts              | Neon `dev` branch                                        | Neon `dev` branch                                                                        | Neon `main` branch                 |
| `LOGS_SOURCE_TOKEN` | api                       | empty (console only)                                     | Better Stack token                                                                       | Better Stack token                 |
| `LOGS_INGEST_URL`   | api                       | empty                                                    | Better Stack source ingesting host, if not the default `https://in.logs.betterstack.com` | same as Preview                    |
| `SENTRY_DSN`        | api                       | empty                                                    | DSN                                                                                      | DSN                                |
| `VITE_SENTRY_DSN`   | web                       | empty                                                    | DSN                                                                                      | DSN                                |
| `E2E`               | api                       | `1` only inside `pnpm test:e2e`                          | **never**                                                                                | **never**                          |
| `NEON_AUTH_URL`     | api (`/auth` proxy, JWKS) | Neon Auth URL of the `dev` branch                        | Neon Auth URL of the `dev` branch                                                        | Neon Auth URL of the `main` branch |
| `ADMIN_EMAILS`      | api, scripts              | your email                                               | your email                                                                               | your email                         |
| `SMTP_USER`         | api (contact form)        | empty (the form answers 503)                             | empty                                                                                    | the Gmail address that sends       |
| `SMTP_PASSWORD`     | api (contact form)        | empty                                                    | empty                                                                                    | its Google **app password**        |
| `CONTACT_TO_EMAIL`  | api (contact form)        | empty                                                    | empty                                                                                    | the address that receives messages |
| `APP_NOW`           | api                       | `2026-10-23` only inside `pnpm test:e2e`                 | **never**                                                                                | **never** (ignored in production)  |
| `PORT`              | api (local)               | optional, default `3000` (`3100` inside `pnpm test:e2e`) | not used                                                                                 | not used                           |

`.env` lives at the repository root. The local API server, `pnpm db:migrate` and `pnpm db:import` load it automatically; Vite reads `VITE_*` variables from it. `E2E` and `APP_NOW` are ignored when `VERCEL_ENV=production`.

`NEON_AUTH_URL` is the branch's **Auth Base URL** (Neon Console → branch → Auth → Configuration, e.g. `https://ep-….neonauth.….neon.tech/neondb/auth`). Each Neon branch has its own users and its own URL. The API uses it to verify tokens (JWKS) and forwards `/auth/*` to it, so the session cookie is first-party (in development Vite passes `/auth/*` to the local API). The Google OAuth client credentials (production) are set in the Neon Console, not as variables here.

In `pnpm test:e2e`, `ADMIN_EMAILS` is set to `owner@example.test` and no `NEON_AUTH_URL` is needed (local signing key).

`ADMIN_EMAILS` is a comma-separated list of the admins: on every request a verified email in this list is an active admin (iteration 3; in iteration 2 only these emails could sign in). The first one owns the imported history. Admin accounts cannot be disabled or removed from the admin screen; edit this variable instead. Set it only in `.env` and Vercel — **never** commit real email addresses.

### Contact form (Gmail)

`POST /api/contact` sends through Gmail SMTP (`smtp.gmail.com:465`) only when `SMTP_USER`, `SMTP_PASSWORD` and `CONTACT_TO_EMAIL` are all set; otherwise it answers 503 and the page says the message could not be sent. To set it up: turn on 2-Step Verification on the Google account, create an app password at <https://myaccount.google.com/apppasswords> (name it "Shooting Clays"), and add the three variables in Vercel (Production). Spaces in the app password are ignored. The email comes from `SMTP_USER` with reply-to the visitor, so answering it replies to them. Previews leave them empty so test messages never reach the inbox. Like `ADMIN_EMAILS`, the addresses live only in Vercel and `.env`, never in the repository.

### Vercel build setting

`ENABLE_EXPERIMENTAL_COREPACK=1` (Production and Preview) makes Vercel install with the pnpm version pinned in `package.json` (`packageManager`). It is only used by Vercel's build, not by the app, so it is not in `.env.example`.

`SITE_URL` (optional, build time) is the canonical address of the public pages, used in their `<link rel="canonical">`, `hreflang`, Open Graph tags, `sitemap.xml` and `robots.txt` (`apps/web/scripts/prerender.mjs`). Default `https://shooting-clays.vercel.app`; set it in Vercel (Production) only when the site moves to its own domain. Previews keep the production address on purpose: they must never compete with it in search results.

Vercel itself sets `VERCEL_ENV` (`production` / `preview`) and `VERCEL_GIT_COMMIT_SHA` (the release in logs).

## GitHub Actions secrets

| Secret                | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `PROD_URL`            | Production URL for the smoke tests                      |
| `SMOKE_HEARTBEAT_URL` | Better Stack heartbeat called when the smoke tests pass |

## Rules

- Real values never go into Git — only `.env.example` with the variable names.
- Adding a variable means updating this table, `.env.example` and `README.md`.
