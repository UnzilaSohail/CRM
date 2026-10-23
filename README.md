# AiNetworks CRM

Enterprise CRM, project delivery and workforce performance. Plan: [plan.md](plan.md). Task list: [docs/BACKLOG.md](docs/BACKLOG.md) (Jira project `CRM`).

## Quick start

Needs Node 20+ and Docker.

```bash
corepack enable          # gives you pnpm (version pinned in package.json)
pnpm install
cp .env.example .env
docker compose up -d     # Postgres 16 + Redis 7
```

## Commands (run from the repo root)

| Command             | What it does                  |
| ------------------- | ----------------------------- |
| `pnpm test`         | Vitest in every package       |
| `pnpm lint`         | ESLint                        |
| `pnpm typecheck`    | TypeScript, no emit           |
| `pnpm build`        | Build all packages            |
| `pnpm format:check` | Prettier check (CI runs this) |

CI (`.github/workflows/ci.yml`) runs format check, lint, typecheck, test and build on every PR.

## Layout

`apps/` api, web, worker. `packages/` shared code (`kpi-engine`, `db`, `types`, `validators`, `ui`). `docs/` decisions, requirements, runbooks. `e2e/` Playwright. `infra/` Docker and Terraform.
