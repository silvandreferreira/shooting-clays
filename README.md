# 🎯 shooting-clays

A mobile-first web app to log clay shooting results and track progress per discipline: **all time**, **last month** and **this month**.

> 📌 This README is maintained together with the code (see `CLAUDE.md` → "Definition of done"). If a command here does not work exactly as written, that is a bug: fix it in the same branch.

**Contents**

1. [What we use and why](#1-what-we-use-and-why)
2. [Repository layout](#2-repository-layout)
3. [Prerequisites](#3-prerequisites)
4. [One-time setup](#4-one-time-setup)
5. [Running locally](#5-running-locally)
6. [Commands](#6-commands)
7. [Before opening a pull request (`pnpm test:all`)](#7-before-opening-a-pull-request-pnpm-testall)
8. [Development workflow: from branch to production](#8-development-workflow-from-branch-to-production)
9. [Deploying](#9-deploying)
10. [Troubleshooting](#10-troubleshooting)
11. [More documentation](#11-more-documentation)

---

## 1. What we use and why

### Overview

```
Phone / browser ──► Vercel (web: React) ──► Vercel (api: Hono) ──► Neon (Postgres)
```

Front end and back end are separate apps that only talk through a **REST API**. The front end never accesses the database.

### Front end — `apps/web`

| Tool                         | Purpose                  | How it is used here                                                                                                                 |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **React**                    | UI library               | Dashboard, Add, History (and Community in iteration 4) screens                                                                      |
| **Vite**                     | Dev server and build     | `pnpm dev` serves `http://localhost:5173` and proxies `/api` to the local API                                                       |
| **TypeScript**               | Typed JavaScript         | `strict` mode; shared types from `packages/shared`                                                                                  |
| **Tailwind CSS**             | Utility-first styling    | Mobile-first layout, dark mode                                                                                                      |
| **React Router**             | Navigation               | `/`, `/add`, `/history`                                                                                                             |
| **TanStack Query**           | API calls and caching    | Shows cached data instantly and refreshes in the background; after saving, updates the cache with the API response                  |
| **Recharts**                 | Charts                   | Score trends and average comparison                                                                                                 |
| **React Hook Form + Zod**    | Forms and validation     | Same validation rules as the API                                                                                                    |
| **vite-plugin-pwa**          | Installable app          | Add to the phone home screen                                                                                                        |
| **Sentry SDK**               | Error capture            | Sends unhandled browser errors to Better Stack/Sentry                                                                               |
| **Vitest + Testing Library** | Component tests          | Isolated component behaviour                                                                                                        |
| **Playwright**               | E2E and regression tests | Drives the whole app on Android, iPhone and desktop profiles, including visual snapshots — see [`docs/testing.md`](docs/testing.md) |

### Back end — `apps/api`

| Tool                         | Purpose                        | How it is used here                                                     |
| ---------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| **Node.js + TypeScript**     | Runtime                        | Runs locally and on Vercel Functions                                    |
| **Hono**                     | HTTP framework                 | Defines the `/api/...` routes                                           |
| **Zod**                      | Validation                     | Validates every request; schemas shared with the front end              |
| **Drizzle ORM**              | Typed database access          | Queries                                                                 |
| **Drizzle Kit**              | Migrations                     | `pnpm db:generate` creates a migration; `pnpm db:migrate` applies it    |
| **@neondatabase/serverless** | Postgres driver for serverless | Connects Vercel Functions to Neon                                       |
| **PGlite**                   | In-memory Postgres             | Integration and E2E tests without Docker or a real database             |
| **Structured logger**        | JSON logs                      | One line per request (route, status, duration), shipped to Better Stack |
| **Vitest**                   | Tests                          | Unit and integration tests                                              |

### Shared — `packages/shared`

Disciplines (and which have A–F targets), Zod schemas, types and the **statistics calculation**. Single source of these rules for both front end and back end.

### External services

| Service          | Purpose                                                            | Plan                       |
| ---------------- | ------------------------------------------------------------------ | -------------------------- |
| **GitHub**       | Code, pull requests, CI (GitHub Actions)                           | Free                       |
| **Vercel**       | Hosts the front end and the API; deploys automatically from GitHub | Hobby (free, personal use) |
| **Neon**         | Postgres database; Google sign-in from iteration 2 (Neon Auth)     | Free (no credit card)      |
| **Better Stack** | Uptime monitors, logs, errors and alerts                           | Free (personal projects)   |

### Quality

| Tool               | Purpose                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **ESLint**         | Finds bugs and bad practices                                                                        |
| **Prettier**       | Consistent formatting                                                                               |
| **Lefthook**       | Git hooks: on commit, formats and lints staged files; on push, runs `pnpm check`                    |
| **GitHub Actions** | On every push/PR: checks, build and E2E regression suite; after each deploy: production smoke tests |

---

## 2. Repository layout

```
shooting-clays/
├─ apps/
│  ├─ web/                 # Front end (React + Vite)
│  │  ├─ e2e/              # Playwright tests
│  │  └─ vercel.json       # Rewrites: /api → api project; SPA → index.html
│  └─ api/                 # Back end (Hono)
│     ├─ src/              # Routes, middleware, data access
│     ├─ drizzle/          # Generated SQL migrations (committed)
│     ├─ scripts/          # import-csv.ts
│     └─ vercel.json       # Function region (fra1)
├─ packages/
│  └─ shared/              # Disciplines, schemas, types, statistics
├─ data/                   # Source CSV files (history)
├─ docs/                   # Detailed documentation
├─ .github/workflows/      # CI, smoke tests, snapshot update
├─ .env.example            # Required variables (no real values)
├─ lefthook.yml            # Git hooks
├─ CLAUDE.md               # Instructions for Claude Code
└─ README.md
```

---

## 3. Prerequisites

Install once:

| Tool                         | Check              | Install                                                               |
| ---------------------------- | ------------------ | --------------------------------------------------------------------- |
| **Git**                      | `git --version`    | macOS: `xcode-select --install` · Windows: <https://git-scm.com>      |
| **Node.js 24 LTS**           | `node --version`   | <https://nodejs.org> (LTS version; see `.nvmrc`)                      |
| **pnpm**                     | `pnpm --version`   | `corepack enable` (ships with Node; version pinned in `package.json`) |
| **GitHub CLI** (recommended) | `gh --version`     | <https://cli.github.com>, then `gh auth login`                        |
| **Vercel CLI** (optional)    | `vercel --version` | `pnpm add -g vercel`, then `vercel login`                             |

Accounts: **GitHub**, **Vercel** (sign in with GitHub), **Neon** (sign in with GitHub or Google), **Better Stack** (after the first deploy).

---

## 4. One-time setup

### 4.1 Repository

Starting from scratch (GitHub repository exists, no commits yet):

```bash
cd ~/shooting-clays
git init                      # if not done yet
git branch -M main            # primary branch is main
git remote add origin https://github.com/<user>/shooting-clays.git
git add .
git commit -m "chore: initial project documentation"
git push -u origin main
```

On another computer:

```bash
git clone https://github.com/<user>/shooting-clays.git
cd shooting-clays
```

### 4.2 Protect `main` on GitHub

**Already configured** for this repository (2026-10-23). Branch protection needs a public repository or GitHub Pro, which is why the repository is public. In **GitHub → Settings → Branches**, `main` has:

- ✅ _Require a pull request before merging_ (0 approvals: solo project)
- ✅ _Require status checks to pass_: `Check (format, lint, types, tests) and build` and `E2E regression suite`
- ✅ _Require branches to be up to date before merging_ (the checks must have run against the latest `main`)
- ✅ _Do not allow bypassing the above settings_ (applies to admins too)
- ✅ _Require linear history_; force pushes and deletion of `main` blocked

Merge settings: **squash merge only**, branches deleted after merge.

Nothing reaches production without passing the tests. To recreate it with the GitHub CLI, see `docs/decisions.md` #37 and `gh api -X PUT repos/<owner>/shooting-clays/branches/main/protection`.

### 4.3 Database (Neon)

1. At <https://console.neon.tech>, create a project **shooting-clays** in region **AWS Europe Central 1 (Frankfurt)**.
2. The project comes with a **`main`** branch — this is **production**.
3. Create a **`dev`** branch from `main` — used for local development and Vercel previews.
4. In **Connect**, copy the connection string of each branch. These are the `DATABASE_URL` values.

> Neon branches are independent copies of the database: break `dev` as much as you like without touching real data.

### 4.4 Local environment variables

```bash
cp .env.example .env
```

Edit `.env` and set the **`dev`** branch connection string:

```dotenv
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
```

> ⚠️ `.env` is **never** committed (it is in `.gitignore`).

### 4.5 Vercel (two projects from the same repository)

At <https://vercel.com/new>, import the repository **twice**:

| Project              | Root Directory | Environment variables                                                           |
| -------------------- | -------------- | ------------------------------------------------------------------------------- |
| `shooting-clays-api` | `apps/api`     | `DATABASE_URL` = Neon **main** branch (Production) and **dev** branch (Preview) |
| `shooting-clays-web` | `apps/web`     | `VITE_SENTRY_DSN` (optional, see 4.6)                                           |

Then:

- In both projects, confirm the **Production Branch** is `main` (Settings → Git).
- Confirm `apps/web/vercel.json` rewrites `/api/*` to the api project domain (e.g. `https://shooting-clays-api.vercel.app`).

### 4.6 Observability and alerts (after the first deploy)

Follow the step-by-step guide in [`docs/observability.md`](docs/observability.md) → "One-time setup": Better Stack account, uptime monitors, log token, error capture and alerts. In GitHub, add the secrets `PROD_URL` and `SMOKE_HEARTBEAT_URL` (Settings → Secrets and variables → Actions).

---

## 5. Running locally

```bash
pnpm install                                 # install all workspace dependencies (also installs Git hooks)
pnpm exec playwright install --with-deps     # first time only: browsers for E2E tests
pnpm db:migrate                              # create/update tables on the Neon dev branch
pnpm db:import                               # import data/clays-results.csv (safe to re-run, no duplicates)
pnpm dev                                     # start web + api
```

| What            | URL                                |
| --------------- | ---------------------------------- |
| App (front end) | <http://localhost:5173>            |
| API             | <http://localhost:3000/api/health> |

To test on your **phone** on the same Wi-Fi: run `pnpm dev:host` and open `http://<computer-ip>:5173`.

Sanity check: the dashboard under "All time" should show Compak Sporting 16 / 8 / 23.

### Using the app

| Screen                   | How to use it                                                                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard** (`/`)      | Choose **All time**, **Last month** or **This month**. Each discipline you have shot has a card: average (large), min, max and number of series; "—" means no series in that period. Below: scores over time (tap a point for details) and the average per discipline. |
| **Add** (`/add`)         | Date (today by default), discipline, score with **−**/**+** or typed (0–25), hardest targets A–F (only Compak Sporting and Sporting), notes. **Save** returns to the dashboard, already updated. If saving fails, the form keeps what you typed and shows an error.    |
| **History** (`/history`) | Every series, newest first, with its hardest targets (e.g. "Hardest targets: A, C and F", hidden when none were recorded) and notes. Filter by discipline. **Edit** opens the same form pre-filled; **Delete** asks for confirmation. Both update the dashboard.       |

- **Offline / slow network:** the dashboard opens instantly from the copy stored in the browser and refreshes in the background. Adding, editing and deleting need a connection.
- **Install on the phone:** open the app in the browser, then _Share → Add to Home Screen_ (iPhone, Safari) or _⋮ → Install app_ (Android, Chrome).
- **Dark mode** follows the phone/computer setting.

Known limitations (no sign-in until iteration 2, not deployed yet, and more): [`docs/roadmap.md`](docs/roadmap.md) → "Known limitations and pending work".

### Development servers

`pnpm dev` runs the API with `tsx watch` (restarts on change) and Vite with hot reload. Both log to the same terminal, prefixed `[api]` and `[web]`; the API prints one JSON line per request.

---

## 6. Commands

Run everything from the **repository root**.

| Command                                                           | What it does                                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                        | Starts web and api in development mode                                                                |
| `pnpm dev:host`                                                   | Same, reachable from other devices on the network (phone)                                             |
| `pnpm build`                                                      | Production build of all packages                                                                      |
| `pnpm format`                                                     | Formats the code with Prettier                                                                        |
| `pnpm format:check`                                               | Checks formatting without changing files                                                              |
| `pnpm lint`                                                       | ESLint on all code                                                                                    |
| `pnpm typecheck`                                                  | TypeScript type check                                                                                 |
| `pnpm test`                                                       | Unit + integration + component tests (fast)                                                           |
| `pnpm test:watch`                                                 | Tests in watch mode                                                                                   |
| `pnpm test:e2e`                                                   | **E2E regression suite** (Playwright): build + API in E2E mode + all browser profiles                 |
| `pnpm test:e2e:ui`                                                | Playwright interactive mode, to watch and debug tests                                                 |
| `pnpm test:e2e:report`                                            | Opens the HTML report of the last `test:e2e` run                                                      |
| `pnpm check`                                                      | Quick gate: `format:check` + `lint` + `typecheck` + `test` (runs automatically on `git push`)         |
| `pnpm test:all`                                                   | **Full gate:** `check` + `build` + `test:e2e` — run before every PR (see section 7)                   |
| `pnpm db:generate`                                                | Generates a migration from schema changes                                                             |
| `pnpm db:migrate`                                                 | Applies migrations to the database in `DATABASE_URL`                                                  |
| `pnpm db:import`                                                  | Imports the CSV history into the database in `DATABASE_URL`                                           |
| `PROD_URL=https://… pnpm --filter @shooting-clays/web test:smoke` | Read-only smoke tests against a deployed environment (run automatically after each production deploy) |

---

## 7. Before opening a pull request (`pnpm test:all`)

`pnpm test:all` is the **full quality gate**. It runs locally exactly what CI runs on GitHub, so a PR only goes up when it is already green. It is mandatory before every PR (also for Claude — see `CLAUDE.md`).

### What it runs, in order

It stops at the first failing step.

| #   | Step                             | Command             | What it checks                                                                                                                        | If it fails                                                                             |
| --- | -------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Formatting                       | `pnpm format:check` | Code is formatted by Prettier                                                                                                         | Run `pnpm format` and commit                                                            |
| 2   | Lint                             | `pnpm lint`         | No ESLint errors (bugs, bad practices, React hooks rules)                                                                             | Fix the reported lines; `pnpm lint --fix` fixes some automatically                      |
| 3   | Types                            | `pnpm typecheck`    | No TypeScript errors in any package                                                                                                   | Fix the reported types                                                                  |
| 4   | Unit/integration/component tests | `pnpm test`         | Statistics (including the reference values), schemas, API endpoints against PGlite, components                                        | Read the failing test; `pnpm test:watch` to iterate                                     |
| 5   | Build                            | `pnpm build`        | Web and API build for production                                                                                                      | Fix build errors (often imports or env usage)                                           |
| 6   | E2E regression                   | `pnpm test:e2e`     | The whole app still works on Android, iPhone and desktop: dashboard values, cache, add/edit/delete, A–F rules, visuals, accessibility | `pnpm test:e2e:report` to see screenshots, video and trace; `pnpm test:e2e:ui` to debug |

### How to read the result

- ✅ **All green** → push the branch and open the PR (section 8).
- ❌ **A test that used to pass now fails** → you broke existing behaviour. Fix the code, **not** the test.
- ❌ **It fails because the behaviour changed on purpose** → update the test in the same branch, add/adjust the row in [`docs/testing.md`](docs/testing.md) and explain the change in the PR.
- ❌ **Visual snapshot difference** (`toHaveScreenshot`) → open the report and compare. Unintended: fix it. Intended: run the **"Update snapshots"** workflow on GitHub Actions and explain it in the PR.

### Checklist before `gh pr create`

- [ ] `pnpm test:all` is green.
- [ ] New feature → has E2E tests; bug fix → has a test that reproduces it.
- [ ] Docs updated (`docs/…`, `README.md` if commands/setup changed, `docs/changelog.md`, `docs/decisions.md` if a decision changed).
- [ ] PR description includes `Docs updated: <files>` or `No docs impact: <reason>`.

### Git hooks (automatic safety net)

Installed by `pnpm install` (Lefthook):

| Hook         | Runs                              | Purpose                                      |
| ------------ | --------------------------------- | -------------------------------------------- |
| `pre-commit` | Prettier + ESLint on staged files | Every commit is formatted and lint-clean     |
| `pre-push`   | `pnpm check`                      | Nothing obviously broken leaves your machine |

The hooks are a quick net; they **do not** replace `pnpm test:all` (they skip build and E2E to stay fast).

---

## 8. Development workflow: from branch to production

```
main ──●──────────────────────────────●──►  production (Vercel)
        \                            /
         feat/name ──●──●──●── PR ──┘  (CI + Vercel preview)
```

### Step 1 — Start from an up-to-date `main`

**In Orca:** create a new worktree from `main` (Orca creates the branch).

**In a terminal:**

```bash
git switch main
git pull
git switch -c feat/short-name        # e.g. feat/history-search
```

Branch prefixes: `feat/` (feature), `fix/` (bug fix), `docs/`, `test/`, `chore/` (maintenance).

### Step 2 — Develop

- Ask Claude for what you want, or change the code yourself.
- Try it with `pnpm dev`.
- Schema change? `pnpm db:generate`, then `pnpm db:migrate` (on `dev`).
- **Write or update tests** (feature → E2E for its flow; bug → test that reproduces it).
- **Update the docs** (`README.md`, `docs/…`, `docs/changelog.md`).

### Step 3 — Run the full gate and commit

```bash
pnpm test:all
git add .
git commit -m "feat: add history search"
```

Message format: `type: short description in imperative mood` (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`).

### Step 4 — Push the branch to GitHub

```bash
git push -u origin feat/short-name
```

(The `pre-push` hook runs `pnpm check` automatically.)

### Step 5 — Open the pull request

```bash
gh pr create --base main --fill
```

(or on GitHub with **Compare & pull request**)

Automatically:

- **GitHub Actions** runs checks, build and the **E2E regression suite**. If something that used to work broke, the PR turns red and cannot be merged.
- **Vercel** creates a **preview**: its own URL with this version of the app, connected to the Neon `dev` branch. Open it on your phone and try it.

### Step 6 — Merge into `main`

When CI is green and the preview looks right:

```bash
gh pr merge --squash --delete-branch
```

(or on GitHub: **Squash and merge**)

### Step 7 — Clean up locally

```bash
git switch main
git pull
```

In Orca, archive or delete the worktree.

---

## 9. Deploying

### Automatic (normal path)

**Merging into `main` deploys to production.** Vercel detects the new commit, builds both projects and publishes them. Follow it at <https://vercel.com/dashboard> or in the PR.

Right after, GitHub Actions runs the **smoke tests** against production (read-only). If they fail, you get an alert — see "Runbook" in [`docs/observability.md`](docs/observability.md).

### When there are database migrations

Production migrations are **always applied explicitly**, never during the build:

1. Migrations must be **backward compatible** (e.g. add an optional column instead of dropping one).
2. **Before** merging, apply them to the production database:

   ```bash
   DATABASE_URL="<Neon main branch connection string>" pnpm db:migrate
   ```

3. Then merge. The new code arrives at a database that is already prepared.

> 💡 Before a risky migration, create a backup branch from `main` in Neon. It is instant and lets you go back.

### Rolling back

- **Code:** Vercel → Deployments → previous deployment → **Promote to Production**. Then fix it properly in Git with a new PR (or `git revert`).
- **Data:** in Neon, restore from a backup branch or use point-in-time restore.

### Manual deploy (exceptional)

```bash
cd apps/api && vercel --prod
cd ../web && vercel --prod
```

---

## 10. Troubleshooting

| Symptom                                       | Likely cause                                                                  | Fix                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| First request takes 1–2 s                     | Neon Free suspends the database after 5 min idle                              | Expected; the dashboard shows cached data meanwhile                                             |
| `DATABASE_URL is not defined`                 | Missing `.env`                                                                | `cp .env.example .env` and fill it in                                                           |
| `pnpm: command not found`                     | pnpm not enabled                                                              | `corepack enable`                                                                               |
| `corepack enable` fails with `EACCES` (macOS) | No write access to `/usr/local/bin`                                           | `corepack enable --install-directory ~/.local/bin pnpm` (that directory must be on your `PATH`) |
| `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`      | pnpm refuses package versions published in the last day (supply-chain policy) | Pin an older version of that package; do not add exclusions                                     |
| `Port 5173 is already in use`                 | Another `pnpm dev` is running                                                 | Stop it (Ctrl+C in its terminal)                                                                |
| Vercel preview returns 404 on `/history`      | Missing SPA fallback                                                          | Check the `/(.*)` → `/index.html` rewrite in `apps/web/vercel.json`                             |
| `/api` returns 404 in production              | Wrong rewrite                                                                 | Check the api domain in `apps/web/vercel.json`                                                  |
| CI fails only on GitHub                       | Environment differences                                                       | Run `pnpm test:all` locally; check the Node version                                             |
| `Executable doesn't exist` (Playwright)       | Browsers not installed                                                        | `pnpm exec playwright install --with-deps`                                                      |
| Visual test fails (`toHaveScreenshot`)        | A screen's look changed                                                       | See section 7, "How to read the result"                                                         |
| Git hook blocks a commit/push                 | Lint, format or tests failing                                                 | Read the output and fix it; do not bypass hooks with `--no-verify`                              |
| Better Stack alert received                   | Site down, errors or slowness                                                 | Follow the runbook in [`docs/observability.md`](docs/observability.md)                          |

---

## 11. More documentation

See [`docs/README.md`](docs/README.md): product, roadmap, architecture, data model, API, environments, testing, observability, decisions and changelog.
