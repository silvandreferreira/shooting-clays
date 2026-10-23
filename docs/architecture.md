# Architecture

> Status: **iteration 1 — implemented** (not yet deployed).

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
│ Vercel · project "web"   │  static files
│ rewrite /api/* ──────────┼──┐
└──────────────────────────┘  │
┌─────────────────────────────▼┐
│ Vercel · project "api"       │  Vercel Functions (fra1)
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

The web project rewrites `/api/*` to the api project, so the browser sees a single origin: no CORS, and session cookies (iteration 2) work without extra configuration.

## Monorepo layout

```
shooting-clays/
├─ apps/
│  ├─ web/                 # React + Vite front end
│  │  ├─ src/
│  │  │  ├─ i18n/en.ts     # all UI strings
│  │  │  ├─ lib/           # API client, queries, persisted query client, colours
│  │  │  ├─ components/    # Layout, cards, charts, session form
│  │  │  └─ pages/         # Dashboard, Add, Edit, History
│  │  ├─ e2e/              # Playwright tests (+ smoke.spec.ts for production)
│  │  └─ vercel.json       # /api rewrite + SPA fallback
│  └─ api/                 # Hono API
│     ├─ src/
│     │  ├─ app.ts         # routes, error format, request logging (createApp(deps))
│     │  ├─ index.ts       # Vercel entry (Neon)
│     │  ├─ server.ts      # local server: pnpm dev (Neon) and E2E (PGlite)
│     │  ├─ db/            # Drizzle schema and clients (Neon HTTP, PGlite)
│     │  └─ import/        # CSV history parser and import
│     ├─ drizzle/          # generated SQL migrations (committed)
│     ├─ scripts/          # migrate.ts, import-csv.ts
│     └─ vercel.json       # function region (fra1)
├─ packages/
│  └─ shared/              # disciplines, schemas, types, stats
├─ data/                   # source CSV files
├─ docs/
├─ .github/workflows/
├─ .env.example
├─ CLAUDE.md
└─ README.md
```

Package manager: **pnpm workspaces**. TypeScript `strict` everywhere.

## Stack

### Front end (`apps/web`)

| Area          | Choice                                            | Why                                                   |
| ------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Framework     | React + Vite + TypeScript                         | Large ecosystem, fast dev server, static build        |
| Routing       | React Router                                      | `/`, `/add`, `/history`, `/history/:id`, `/community` |
| Styling       | Tailwind CSS                                      | Mobile-first utility classes, dark mode               |
| Charts        | Recharts                                          | Declarative, responsive                               |
| Forms         | React Hook Form + Zod (shared schemas)            | Same validation as the API                            |
| Data & cache  | TanStack Query + `persistQueryClient` (IndexedDB) | See "Caching"                                         |
| PWA           | vite-plugin-pwa                                   | Installable on the phone home screen                  |
| i18n          | Single strings file (`src/i18n/en.ts`)            | English now, Portuguese possible later                |
| Error capture | Sentry SDK                                        | See `observability.md`                                |
| Tests         | Vitest + Testing Library; Playwright              | See `testing.md`                                      |

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

## Request flows

### Opening the app

1. TanStack Query restores the persisted cache → **dashboard renders immediately**.
2. Background `GET /api/dashboard`.
3. If the response differs, the UI updates and the cache is persisted again.

### Adding a session

1. The user opens **Add** and fills in the form (Zod-validated).
2. `POST /api/sessions`.
3. The API validates, inserts, recalculates the dashboard and returns `{ session, dashboard }`.
4. The app calls `setQueryData(['dashboard'], dashboard)` (no second request) and navigates back.
5. On error: the form keeps its data and shows the error.

## Caching

| Query key                                          | Content                   | Freshness                                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `['dashboard']`                                    | Statistics + chart series | Fresh for 30 s (`DASHBOARD_FRESH_MS`): revalidated on app open (the restored cache is older) and always on window focus; data written by a mutation counts as fresh, so returning to the dashboard after saving makes no request |
| `['sessions', filters]`                            | History list              | Revalidated when History opens                                                                                                                                                                                                   |
| `['leaderboard', month, discipline]` (iteration 4) | Ranking                   | Stale after a few minutes                                                                                                                                                                                                        |

The persisted cache carries a version (`buster`); bump it whenever the cached data shape changes.

## Implementation notes

- `createApp({ db, now, logger, … })` receives its dependencies, so the same routes run on Neon (dev/production), on PGlite (tests, E2E) and with a fixed clock.
- `packages/shared` is consumed as TypeScript source (no build step); Vite, tsx and Vitest compile it.
- Discipline colours are fixed per discipline (validated categorical palette, light and dark steps) in `apps/web/src/index.css`.
- Persisted cache: IndexedDB via `idb-keyval`, key `shooting-clays-cache`, max age 7 days, `buster` in `apps/web/src/lib/query-client.ts`.

## Hosting notes

- Function region `fra1` (Frankfurt) and Neon region AWS `eu-central-1`, to keep API ↔ database latency low.
- Neon Free suspends compute after 5 minutes idle: the first request afterwards is slower. The cached dashboard hides this.
- Vercel Hobby is for personal, non-commercial use.
