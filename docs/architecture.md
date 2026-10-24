# Architecture

> Status: **iterations 1–3 — implemented and in production**.

## Overview

```
┌──────────────────────────┐
│ Phone / browser          │
│ React SPA (PWA)          │
│ TanStack Query +         │
│ persisted cache          │
└────────────┬─────────────┘
             │ HTTPS · REST · JSON
┌────────────▼─────────────┐
│ Vercel · one project     │  static files (web app)
│ /api/*, /auth/* ─────────┼──┐
└──────────────────────────┘  │
┌─────────────────────────────▼┐
│ Vercel Function "api" (fra1) │──/auth/*──► Neon Auth (branch)
│ Hono · Zod · Drizzle         │
└────────────┬─────────────────┘
             │ Neon serverless driver
┌────────────▼─────────────┐
│ Neon · Postgres (EU)     │  branches: main (prod), dev
└──────────────────────────┘
```

| Component         | Responsibility                                                 | Does not            |
| ----------------- | -------------------------------------------------------------- | ------------------- |
| `apps/web`        | UI, local cache, form validation                               | Access the database |
| `apps/api`        | Business rules, validation, data access, dashboard calculation | Serve HTML          |
| `packages/shared` | Disciplines, Zod schemas, types, statistics                    | Do I/O              |
| Neon              | Persistence (and auth from iteration 2)                        | —                   |

One Vercel project serves the static web app and one function for `/api/*` and `/auth/*`, so the browser sees a single origin: no CORS, and Neon Auth's session cookie is first-party. Production and previews differ only in their environment variables (Neon `main` or `dev` branch), decision #46.

## Monorepo layout

```
shooting-clays/
├─ apps/
│  ├─ web/                 # React + Vite front end
│  │  ├─ src/
│  │  │  ├─ i18n/en.ts     # all UI strings
│  │  │  ├─ lib/           # API client, queries, persisted query client, colours
│  │  │  ├─ components/    # Layout, cards, charts, session form
│  │  │  └─ pages/         # Dashboard (real and sample), Add, Edit, History, Admin, Inactive
│  │  └─ e2e/              # Playwright tests (+ smoke.spec.ts for production)
│  └─ api/                 # Hono API
│     ├─ src/
│     │  ├─ app.ts         # routes, error format, request logging (createApp(deps))
│     │  ├─ auth-proxy.ts  # /auth/* → Neon Auth of this environment
│     │  ├─ runtime.ts     # server app on Neon: /api + /auth (Vercel and pnpm dev)
│     │  ├─ e2e-runtime.ts # E2E app (PGlite, test routes); never in the Vercel bundle
│     │  ├─ vercel.ts      # Vercel Function entry
│     │  ├─ server.ts      # local server: pnpm dev (Neon) and E2E (PGlite)
│     │  ├─ db/            # Drizzle schema and clients (Neon HTTP; PGlite in memory.ts)
│     │  └─ import/        # CSV history parser and import
│     ├─ drizzle/          # generated SQL migrations (committed)
│     └─ scripts/          # migrate.ts, import-csv.ts, assign-owner.ts
├─ packages/
│  └─ shared/              # disciplines, schemas, types, stats
├─ data/                   # source CSV files
├─ scripts/build-vercel.mjs # assembles .vercel/output (Build Output API)
├─ vercel.json             # Vercel project settings
├─ docs/
├─ .github/workflows/
├─ .env.example
├─ CLAUDE.md
└─ README.md
```

Package manager: **pnpm workspaces**. TypeScript `strict` everywhere.

## Stack

### Front end (`apps/web`)

| Area          | Choice                                            | Why                                                                          |
| ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Framework     | React + Vite + TypeScript                         | Large ecosystem, fast dev server, static build                               |
| Routing       | React Router                                      | `/`, `/add`, `/history`, `/history/:id`, `/community`, `/settings`, `/admin` |
| Styling       | Tailwind CSS                                      | Mobile-first utility classes, dark mode                                      |
| Charts        | Recharts                                          | Declarative, responsive                                                      |
| Forms         | React Hook Form + Zod (shared schemas)            | Same validation as the API                                                   |
| Data & cache  | TanStack Query + `persistQueryClient` (IndexedDB) | See "Caching"                                                                |
| PWA           | vite-plugin-pwa                                   | Installable on the phone home screen                                         |
| i18n          | Single strings file (`src/i18n/en.ts`)            | English now, Portuguese possible later                                       |
| Error capture | Sentry SDK                                        | See `observability.md`                                                       |
| Tests         | Vitest + Testing Library; Playwright              | See `testing.md`                                                             |

### Back end (`apps/api`)

| Area               | Choice                                                                              |
| ------------------ | ----------------------------------------------------------------------------------- |
| Runtime            | Node.js LTS + TypeScript on Vercel Functions                                        |
| HTTP framework     | Hono, with `@hono/zod-validator`                                                    |
| Validation         | Zod (shared schemas)                                                                |
| Database           | Neon Postgres via `@neondatabase/serverless` (HTTP driver, `drizzle-orm/neon-http`) |
| ORM & migrations   | Drizzle ORM + Drizzle Kit                                                           |
| Auth (iteration 2) | Neon Auth (managed Better Auth), Google provider                                    |
| Logging            | Structured JSON logger (see `observability.md`)                                     |
| Tests              | Vitest; integration via Hono `app.request()` against PGlite                         |

### Quality tooling

| Tool                                                                   | Purpose                                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ESLint (flat config, `typescript-eslint`, `eslint-plugin-react-hooks`) | Static analysis                                                                  |
| Prettier                                                               | Formatting                                                                       |
| Lefthook                                                               | Git hooks: pre-commit formats and lints staged files; pre-push runs `pnpm check` |
| GitHub Actions                                                         | CI on every push/PR; production smoke tests after deploy                         |

## Authentication (iteration 2)

```
Browser ──/auth/*──► our origin ──► API proxy ──► Neon Auth (branch)   session cookie, first-party
Browser ──/api/* + Bearer JWT──► API ──verify with JWKS──► Neon Auth public keys       no call per request
```

- **Neon Auth** (managed Better Auth) holds users and sessions in the branch's `neon_auth` schema; each Neon branch has its own users and its own Auth URL (`NEON_AUTH_URL`). Only the Google provider is used.
- **Same-origin proxy.** The browser talks to Neon Auth through `/auth/*` on our own origin, so the session cookie is first-party. The API forwards those requests to `NEON_AUTH_URL` (`apps/api/src/auth-proxy.ts`): on Vercel directly, in development through the Vite proxy. It drops our own hop headers (`x-forwarded-*`, `x-vercel-*`), never follows redirects and removes any cookie `Domain`. Talking to `*.neon.tech` directly would make it a third-party cookie, which Safari (ITP) blocks. Verified in Chrome and Safari on 2026-10-23.
- **Google sign-in.** `signIn.social({ provider: 'google' })` → Google → Neon's callback → back to our origin with `?neon_auth_session_verifier=…`. On start, the app exchanges it for the session (`completeSignInRedirect()` in `apps/web/src/lib/auth.ts`) before rendering.
- **API calls** carry `Authorization: Bearer <JWT>` from `authClient.token()` (15 minutes; cached and refreshed one minute before expiry; a 401 triggers one retry with a fresh token). The API verifies signature, issuer and expiry with `jose` against the JWKS (`apps/api/src/auth.ts`), then reads the user's profile (created `pending` on first sign-in) and applies the account status and role (iteration 3: pending/disabled → 403 except `GET /api/me`; verified `ADMIN_EMAILS` → active admin).
- **Client:** the official `better-auth` client (`better-auth/react` + `jwtClient`); Neon's `@neondatabase/neon-js` SDK is still beta and pulls server-side dependencies.
- **Per-user cache.** The persisted cache's `buster` includes the user id, so another account's cache is discarded instead of shown; signing out ends the session, blocks further cache writes (a throttled write may already be scheduled) and then deletes the cache. The last signed-in user is kept in `localStorage` (`shooting-clays-user`) only so the app can open offline from that user's cache; it is removed as soon as Neon Auth reports no session.
- **Tests never touch Google or Neon Auth.** API tests and E2E mode sign tokens with a local Ed25519 key (`createTestAuth()`); in E2E, Playwright answers `/auth/*` like Neon Auth and fetches tokens from `/api/__test__/token`, so the real API verification path runs.

## Request flows

### Opening the app

1. The session is read from Neon Auth (or, offline, the last signed-in user is assumed).
1. TanStack Query restores that user's persisted cache → **dashboard renders immediately**.
1. Background `GET /api/dashboard`.
1. If the response differs, the UI updates and the cache is persisted again.

### Adding a session

1. The user opens **Add** and fills in the form (Zod-validated).
2. `POST /api/sessions`.
3. The API validates, inserts, recalculates the dashboard and returns `{ session, dashboard }`.
4. The app calls `setQueryData(['dashboard'], dashboard)` (no second request) and navigates back.
5. On error: the form keeps its data and shows the error.

## Caching

| Query key                                                 | Content                           | Freshness                                                                                                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `['me']`                                                  | Name, avatar, email, role, status | Always revalidated on app open and window focus: an approval or disable applies without signing out. A data request answered `ACCOUNT_PENDING`/`ACCOUNT_DISABLED` re-checks it too. Decides which screens are shown              |
| `['admin', 'users']`                                      | Admin's user list                 | Admins only; revalidated on open and focus; also drives the pending badge                                                                                                                                                        |
| `['dashboard']`                                           | Statistics + chart series         | Fresh for 30 s (`DASHBOARD_FRESH_MS`): revalidated on app open (the restored cache is older) and always on window focus; data written by a mutation counts as fresh, so returning to the dashboard after saving makes no request |
| `['sessions', filters]`                                   | History list                      | Revalidated when History opens                                                                                                                                                                                                   |
| `['leaderboard', discipline, period, date]` (iteration 4) | Ranking                           | Stale after a few minutes                                                                                                                                                                                                        |

The persisted cache carries a version (`buster` = `CACHE_BUSTER:userId`); bump `CACHE_BUSTER` whenever the cached data shape changes.

## Implementation notes

- `createApp({ db, now, logger, … })` receives its dependencies, so the same routes run on Neon (dev/production), on PGlite (tests, E2E) and with a fixed clock.
- `packages/shared` is consumed as TypeScript source (no build step); Vite, tsx and Vitest compile it.
- Discipline colours are fixed per discipline (validated categorical palette, light and dark steps) in `apps/web/src/index.css`.
- Persisted cache: IndexedDB via `idb-keyval`, key `shooting-clays-cache`, max age 7 days, `buster` in `apps/web/src/lib/query-client.ts`.

## Hosting notes

- Function region `fra1` (Frankfurt) and Neon region AWS `eu-central-1`, to keep API ↔ database latency low.
- Neon Free suspends compute after 5 minutes idle: the first request afterwards is slower. The cached dashboard hides this.
- Vercel Hobby is for personal, non-commercial use.
- **Build.** `pnpm build` builds every package and then runs `scripts/build-vercel.mjs`, which writes the deployment in Vercel's Build Output API format: `apps/web/dist` as static files, and `apps/api/src/vercel.ts` bundled with esbuild into one Node.js function (`api`, region `fra1`). Routes: `/api/*` and `/auth/*` → the function; then static files; anything else → `index.html` (client routes). `/assets/*` (hashed names) are cached for a year. The bundle never includes PGlite or the E2E test routes.
