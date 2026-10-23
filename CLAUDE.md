# CLAUDE.md — shooting-clays

This file is loaded automatically at the start of every Claude Code session. It is intentionally short: it holds the rules that always apply and tells you **which document to read for each kind of task**. Do not duplicate detailed content here; link to `docs/`.

## 1. Project in one paragraph

A mobile-first web app (PWA) to log clay shooting results (date, discipline, score out of 25, hardest targets, notes) and see a dashboard per discipline for **all time**, **last month** and **this month**. React front end and a separate REST API (Hono) on Vercel, Postgres on Neon. Roadmap: iteration 1 = core app, iteration 2 = Google sign-in, iteration 3 = admin approval and user management, iteration 4 = community leaderboard, iteration 5 = interactive scores chart (see `docs/roadmap.md`).

## 2. Language rules (strict)

| What                                                                                                                                                                                   | Language                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Conversation with the owner (chat in Orca)                                                                                                                                             | **European Portuguese (pt-PT)** |
| Everything in the repository: code, identifiers, comments, commit messages, branch names, PR titles and descriptions, documentation, test names, UI text, log messages, error messages | **English**                     |

UI strings live in one place (`apps/web/src/i18n/en.ts`) so a Portuguese translation can be added later without touching components.

## 3. Context: what to read before each task

Read only what the task needs; these files are the source of truth.

| If the task involves…                                     | Read first                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Anything (first task in a session)                        | `README.md` (tools, commands, workflow) and `docs/roadmap.md` (current iteration) |
| Product behaviour, disciplines, statistics rules, screens | `docs/product.md`                                                                 |
| Architecture, stack, caching, folder layout               | `docs/architecture.md`                                                            |
| Database schema or migrations                             | `docs/data-model.md`                                                              |
| API endpoints                                             | `docs/api.md`                                                                     |
| Environment variables, secrets, environments              | `docs/environments.md`                                                            |
| Writing or running tests, regression suite                | `docs/testing.md`                                                                 |
| Logging, monitoring, alerts                               | `docs/observability.md`                                                           |
| "Why was X done this way?" or changing a past decision    | `docs/decisions.md`                                                               |
| Source data / import                                      | `data/` and `docs/data-model.md` (Import section)                                 |

## 4. How to work

1. For any non-trivial task, **propose a plan first and wait for approval**.
2. Ask before anything hard to undo: deleting data, changing the data model, production deploys, production migrations.
3. One branch per change (`feat/…`, `fix/…`, `docs/…`, `chore/…`, `test/…`), never commit directly to `main`. Conventional Commits. Workflow in `README.md` → "Development workflow".
4. Never commit secrets. Never log secrets or personal data.
5. Do not invent commands in the docs: every command documented in `README.md` must have been run and work as written.

## 5. Definition of done (every change)

A change is done only when **all** of these are true:

- [ ] Tests added or updated: a new feature has E2E tests for its main flow; a bug fix has a test that reproduces the bug (fails before, passes after). Tests are never deleted or skipped to make CI pass. See `docs/testing.md`.
- [ ] `pnpm test:all` passes locally (see `README.md` → "Before opening a pull request").
- [ ] Documentation updated in the same branch:
  - files in `docs/` affected by the change;
  - `README.md` if tools, commands, setup or workflow changed;
  - `.env.example` and `docs/environments.md` if environment variables changed;
  - `docs/decisions.md` for every new or changed technical decision;
  - `docs/changelog.md` entry under "Unreleased";
  - the regression suite table in `docs/testing.md` for every new test scenario.
- [ ] The PR description contains a "Docs" line: `Docs updated: <files>` or `No docs impact: <reason>`.

## 6. Invariants (never break without an explicit decision)

- Dashboard figures for the reference dataset must match `docs/testing.md` → "Reference values".
- Front end never talks to the database; only through the REST API.
- `/api/health` must not touch the database (see `docs/observability.md`).
- Test-only endpoints exist only when `E2E=1`.
- Authorization (account status, admin role) is always enforced in the API, never only in the UI.
- Real email addresses never appear in the repository (use `ADMIN_EMAILS` in env vars).
