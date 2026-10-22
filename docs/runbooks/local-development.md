# Local development

Requirements: Node 22.12 or newer, pnpm 10, Docker (for Postgres and Redis).

```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d     # Postgres 16 and Redis 7
pnpm db:migrate                                              # applies packages/db/prisma/migrations
pnpm typecheck && pnpm test                                  # 9 packages
```

Run the apps:

| App | Command | URL |
|---|---|---|
| Web | `pnpm --filter @crm/web dev` | http://localhost:3000 |
| API | `pnpm --filter @crm/api build && pnpm --filter @crm/api start` | http://localhost:4000/health |
| Worker | `pnpm --filter @crm/worker build && pnpm --filter @crm/worker start` | needs Redis |

Build the shared packages first (`pnpm build`) because apps import their compiled output.

## Calling the API during development

Identity is a placeholder header until auth lands:

```bash
curl -H "x-demo-role: CEO" localhost:4000/projects
curl -H "x-demo-role: CUSTOMER" localhost:4000/portal/projects
```

## Tests

- `kpi-engine`, `types`, `validators`, `worker`, `db`: Vitest. The `db` suite applies the real migrations to an in-process Postgres and checks tenant isolation and append-only tables.
- `api`: Node test runner, role x endpoint matrix against the compiled app.
