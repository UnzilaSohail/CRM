# Local development

Requirements: Node 22.12 or newer, pnpm 10. Docker (Postgres and Redis) is optional: the API can run on an in-memory database.

```bash
pnpm install
cp .env.example .env
docker compose up -d     # Postgres 16 and Redis 7
pnpm db:migrate                                              # applies packages/db/prisma/migrations
pnpm typecheck && pnpm test                                  # 9 packages
```

Run the apps:

| App    | Command                                                              | URL                          |
| ------ | -------------------------------------------------------------------- | ---------------------------- |
| Web    | `pnpm --filter @crm/web dev`                                         | http://localhost:3000        |
| API    | `pnpm --filter @crm/api build && pnpm --filter @crm/api start`       | http://localhost:3001/health |
| Worker | `pnpm --filter @crm/worker build && pnpm --filter @crm/worker start` | needs Redis                  |

Build the shared packages first (`pnpm build`) because apps import their compiled output.

## Run everything without Docker

```bash
pnpm install && pnpm build
pnpm --filter @crm/api dev:memory      # API on :3001, seeded in-memory Postgres (nothing persists)
pnpm --filter @crm/web start           # web on :3000 (or `dev` for hot reload)
```

Sign in at http://localhost:3000/login. Every seeded user has the password `Passw0rd!demo`:

| Role                   | Email                           |
| ---------------------- | ------------------------------- |
| CEO                    | ceo@ainetworks.test             |
| Super admin            | super.admin@ainetworks.test     |
| Project manager        | project.manager@ainetworks.test |
| Team lead              | team.lead@ainetworks.test       |
| Employee               | employee@ainetworks.test        |
| Customer (portal only) | customer@ainetworks.test        |

The password is for development data only. Production needs `AUTH_SECRET` (32+ characters) set, or the API refuses to start.

## Calling the API directly

```bash
TOKEN=$(curl -s -X POST localhost:3001/auth/login -H 'content-type: application/json'   -d '{"email":"ceo@ainetworks.test","password":"Passw0rd!demo"}' | jq -r .token)
curl -H "authorization: Bearer $TOKEN" localhost:3001/projects
```

OpenAPI docs are served at http://localhost:3001/docs.

## Tests

- `kpi-engine`, `types`, `validators`, `worker`, `ui`: Vitest.
- `db`: Vitest against the real migrations on an in-process Postgres (PGlite) through a real PrismaClient: tenant isolation, append-only tables, login lookup.
- `api`: Vitest for env/health, plus a Node test-runner suite (142 tests) against the compiled app and the same in-process database: role x endpoint matrix, login, MFA, customers, portal isolation, deviation acknowledgement.
- `e2e`: Playwright in real Chrome. It starts the API (`dev:memory`) and the web app itself; run `pnpm build` first.
