# Observability and alerting

> Status: **implemented in code and in production** (structured logger, health endpoints, Sentry SDK; production smoke tests run automatically after each deploy since 2026-10-23). **Not set up yet:** the Better Stack account, monitors and log token, Sentry DSNs and `SMOKE_HEARTBEAT_URL` ("One-time setup" below), so logs only reach Vercel's 1-hour log view for now. Tool: **Better Stack** (free plan for personal projects: uptime monitors, logs, error tracking and alerts by email/Slack).

## Why Vercel and Neon alone are not enough

- **Vercel Hobby** keeps function logs for **1 hour** only and does not support log drains. The API therefore ships logs directly from code.
- **Neon Free** has monitoring and usage pages in its console, but does not alert when the API is down.

## What is monitored

| Signal                       | Tool                                                      | Setup                                        | Alert when                                       |
| ---------------------------- | --------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Web up                       | Better Stack Uptime                                       | `GET https://<web>/` every 3 min             | Not 200                                          |
| API up                       | Better Stack Uptime                                       | `GET https://<web>/api/health` every 3 min   | Not 200                                          |
| Database reachable           | Better Stack Uptime                                       | `GET https://<web>/api/health/db` **hourly** | 503                                              |
| API logs                     | Better Stack Logs                                         | Structured logger, one line per request      | (see log alerts)                                 |
| 5xx errors                   | Better Stack log alert                                    | Count of `status >= 500`                     | More than 3 in 10 min                            |
| Slowness                     | Better Stack log alert                                    | `durationMs` p95                             | > 3 s for 15 min (allowing for Neon cold starts) |
| Front-end and API exceptions | Sentry SDK → Better Stack error tracking (or Sentry free) | Unhandled exceptions                         | New error                                        |
| Production after deploy      | GitHub Actions smoke tests + Better Stack heartbeat       | Runs after every deploy                      | Smoke tests fail / heartbeat missed              |
| Neon usage                   | Neon console                                              | Monitoring and Usage pages                   | Close to compute/storage limits                  |
| Vercel usage                 | Vercel dashboard                                          | Usage page                                   | Close to Hobby limits                            |

> ⚠️ **Do not poll the database often.** Neon Free suspends compute after 5 minutes idle and has a monthly compute allowance. A `SELECT 1` every 30 seconds would keep it awake permanently and burn the allowance. That is why `/api/health` never touches the database.

## Log format

One JSON line per request:

```json
{
  "level": "info",
  "time": "2026-10-23T14:05:00Z",
  "requestId": "…",
  "method": "POST",
  "route": "/api/sessions",
  "status": 201,
  "durationMs": 182,
  "env": "production",
  "release": "<commit sha>"
}
```

- **Never** log secrets (`DATABASE_URL`, tokens), cookies, email addresses or session notes.
- Admin actions (iteration 3) add one line each, with ids only: `{ "action": "user_status_changed", "adminId", "status" }` and `{ "action": "user_removed", "adminId", "at" }` (the removed user is not identified).
- Errors: `level: "error"` with message and stack, without request bodies.
- Without a token (local, tests, E2E) logs go to the console only and the app works normally.
- Implementation: `apps/api/src/logger.ts` (request middleware in `app.ts`). With `LOGS_SOURCE_TOKEN`, each line is also POSTed to Better Stack (`LOGS_INGEST_URL`), kept alive with `waitUntil` from `@vercel/functions`.
- Errors: the API's `onError` logs them and, when `SENTRY_DSN` is set, sends them to Sentry; the web app initialises Sentry only when `VITE_SENTRY_DSN` is set and wraps the app in an error boundary.

## One-time setup (after the first deploy)

1. Create an account at <https://betterstack.com>.
2. **Uptime → Create monitor**: create the three monitors above; set email (and Slack, optionally) as alert destinations.
3. **Telemetry → Sources → Connect source**: choose JavaScript/Node and copy the source token.
4. In Vercel, project **api**, add `LOGS_SOURCE_TOKEN` (Production and Preview). See `environments.md`.
5. For errors, create an error-tracking source (or a Sentry project) and set `SENTRY_DSN` (api) and `VITE_SENTRY_DSN` (web).
6. **Uptime → Heartbeats**: create a heartbeat `smoke-prod`; store its URL as the GitHub secret `SMOKE_HEARTBEAT_URL`. The smoke workflow pings it when it passes; a missed ping raises an alert.
7. **Telemetry → Alerts**: create the 5xx and latency alerts.
8. Optional: a status page.

## Runbook — when an alert fires

| Alert              | First step                                                  | If caused by the latest deploy                                         |
| ------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Web/API down       | Check <https://www.vercel-status.com> and Better Stack logs | Vercel → Deployments → previous deployment → **Promote to Production** |
| Database down      | Check the Neon console (status, plan limits)                | —                                                                      |
| Many 5xx           | Filter logs by `level:error`, follow the `requestId`        | Roll back as above, then fix in a PR with a regression test            |
| Smoke tests failed | Open the Playwright report in GitHub Actions                | Roll back as above                                                     |
| Close to limits    | Check Neon/Vercel usage                                     | Review monitor frequency and unnecessary requests                      |

Every real incident produces a regression test (`testing.md`) and, if relevant, an entry in `decisions.md`.
