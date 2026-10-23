# Documentation

Detailed technical documentation. Start with the root [`README.md`](../README.md) (tools, local setup, Git workflow, deployment).

| Document | Read it when… |
|---|---|
| [product.md](product.md) | You need the product rules: disciplines, statistics, screens, caching behaviour |
| [roadmap.md](roadmap.md) | You want to know the current iteration and what comes next (auth, community) |
| [architecture.md](architecture.md) | You want to understand the stack, the folder layout, request flows and caching |
| [data-model.md](data-model.md) | You touch the database, migrations or the CSV import |
| [api.md](api.md) | You use or change an endpoint |
| [environments.md](environments.md) | You need to know which variables exist and where they are set |
| [testing.md](testing.md) | You write or run tests, including the regression suite |
| [observability.md](observability.md) | You look at logs, set up alerts, or an alert fired |
| [decisions.md](decisions.md) | You want to know why something was done a certain way |
| [changelog.md](changelog.md) | You want to know what changed and when |

> **Rule:** every change that affects behaviour, API, data, configuration or commands updates these files in the same branch (see `CLAUDE.md` → "Definition of done").
