# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Every PR adds its entry under **Unreleased**; when a release reaches production, that section gets a date.

## Unreleased

### Iteration 1

- **Added:** pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`) with TypeScript strict, ESLint, Prettier, Lefthook hooks and GitHub Actions (CI, production smoke tests, snapshot update).
- **Added:** `packages/shared`: disciplines, Zod schemas and dashboard statistics, tested against the reference values.
- **Added:** REST API (Hono + Drizzle): health, disciplines, dashboard and sessions CRUD; migration `0000_create_sessions`; idempotent CSV import (`pnpm db:import`); structured JSON logging and optional Sentry.
- **Added:** web app: Dashboard (periods, cards, charts), Add, History with edit/delete, persisted cache (IndexedDB), PWA, dark mode, i18n strings file.
- **Added:** History shows each session's hardest targets as a readable list ("A, C and F").
- **Fixed:** returning to the dashboard after saving no longer makes a second `GET /api/dashboard` (R4 now checks it).
- **Added:** accessibility checks (R10) also run in dark mode.
- **Changed:** repository is public; `main` is protected and only accepts squash-merged PRs whose CI (checks, build and E2E) passed.
- **Removed:** hardest-target counts chart from the product scope (decision #35).
- **Added:** E2E regression suite R1–R12 and smoke test S1 (Playwright on Pixel, iPhone and desktop profiles, with axe accessibility checks).
- **Added:** project specification and documentation (`CLAUDE.md`, `README.md`, `docs/`), including the regression testing strategy, observability plan and roadmap for iterations 2 (authentication) and 3 (community).
- **Added:** roadmap for iteration 4 (admin approval, disable and removal of users).
- **Added:** roadmap for iteration 5 (scores chart with its own time range and show/hide per discipline).
