# AiNetworks CRM: Optimized Build Plan

Source: AiNetworks CRM Requirements Document (v1.0). Status: proposal, pending the decisions listed at the end.

## 1. Recommended Stack

One TypeScript codebase end to end: smallest team, fastest delivery, shared types and validation between UI and API.

| Layer          | Choice                                                | Why                                                                              |
| -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Monorepo       | pnpm + Turborepo                                      | Shared `types`, `kpi-engine`, `ui` packages                                      |
| Frontend       | Next.js (App Router) + React + Tailwind + shadcn/ui   | Server components keep the JS bundle small; spec colour tokens map onto Tailwind |
| Data fetching  | TanStack Query, TanStack Table (virtualized), dnd-kit | Cached data, optimistic Kanban drags, fast large tables                          |
| Charts         | Recharts or uPlot                                     | Light, dashboard-friendly                                                        |
| API            | NestJS on Fastify (or Hono for a leaner build)        | Modular, RBAC guards, generates OpenAPI docs                                     |
| Validation     | Zod, shared client and server                         | One schema for forms and API payloads                                            |
| Database       | PostgreSQL + Prisma or Drizzle                        | Relational data; Row-Level Security enforces tenant isolation                    |
| Cache / queues | Redis + BullMQ                                        | KPI snapshot jobs, alert dedupe, notification retries, rate limits               |
| Realtime       | WebSocket (Socket.IO, Redis adapter)                  | Project chat, live alerts, presence                                              |
| Auth           | Auth.js or managed (Clerk / WorkOS / Auth0)           | MFA, invites, SSO, sessions (UX01)                                               |
| Files          | Cloudflare R2 / S3, presigned uploads, ClamAV scan    | No egress fees, direct-to-bucket uploads                                         |
| Search         | Postgres full-text + `pg_trgm`                        | Global search and customer dedupe, no Elasticsearch needed                       |
| Observability  | OpenTelemetry + Sentry + Grafana/Better Stack         | Required by spec                                                                 |
| Mobile         | Responsive PWA with offline queue                     | Fastest to ship; native later if needed                                          |

## 2. Hosting

**Recommended: AWS, single region close to users.**

- Frontend: Vercel (quickest) or CloudFront + Next on ECS/Lambda
- API and workers: ECS Fargate, two containers (`api`, `worker`), autoscaling
- Database: RDS PostgreSQL (Multi-AZ) behind RDS Proxy or PgBouncer
- Redis: ElastiCache
- Edge: CloudFront + Cloudflare WAF
- IaC: Terraform
- CI/CD: GitHub Actions, preview environments per PR, blue/green deploys, tested rollback

**Cheaper pilot alternative:** Vercel + Railway or Fly.io + Neon Postgres + Upstash Redis. Everything is containerized, so migrating to AWS later is straightforward.

Azure only if clients require it or the team is Microsoft-centric.

## 3. Performance Strategy

1. **Precomputed KPIs.** BullMQ jobs write daily/weekly/monthly `KPI Snapshot` rows (with time zone and baseline version). Dashboards read snapshots, never aggregate raw tables per request. Biggest speed win.
2. **Deviation engine as an event pipeline.** Saving a task or progress update queues a recompute. Dedupe key: `(subject, baseline_version, threshold, period)`, so 80% planned vs 40% actual yields exactly one 50% alert sequence.
3. **Server components + streaming.** Render the dashboard shell instantly, stream KPI cards.
4. **Indexes designed up front.** `(tenant_id, ...)` composite indexes on every table; partial indexes for open tasks and active alerts; cursor pagination only.
5. **Redis caching** for permission lookups, dashboard aggregates (short TTL, invalidated on snapshot) and rate limiting.
6. **Optimistic UI** for Kanban drags and My Day quick updates.
7. **Table virtualization**, lazy-loaded charts and drawers.
8. **Budgets enforced in CI:** LCP < 2.0s, API read p95 < 200ms, first-load JS about 170KB or less.

## 4. Security and Architecture Rules

- `tenant_id` on every row; Postgres RLS as backstop to app-level guards.
- Separate client portal API module with its own DTOs; returns only `client_visible = true`; never shares query code with the internal API; publication enforced server-side per endpoint.
- Field-level gating: pay/cost fields stripped by serializers for all roles except CEO.
- Append-only `AuditEvent`; immutable, versioned baselines.
- Authorization test matrix (every role x endpoint) in CI.

## 5. Build Roadmap (about 12 weeks)

| Weeks | Deliverable                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1-2   | Settle blocking decisions; KPI dictionary, permissions matrix, ERD; scaffold monorepo, CI/CD, auth, tenancy; design-system package (navy `#0C2752`, blue `#2458E8`, bg `#F5F7FB`); clickable prototype |
| 3-5   | Customers, contacts, projects, weighted milestones, tasks and assignments (list + Kanban), attendance, My Day, time entries                                                                            |
| 6-7   | `kpi-engine` package (pure functions, heavily tested), snapshot jobs, executive dashboard, scorecard, deviation center, alerts and escalation                                                          |
| 8-9   | Client portal and approvals, project chat (WebSocket), publish/unpublish, visibility isolation tests                                                                                                   |
| 10-11 | PWA and mobile polish, CSV/XLSX/PDF exports (queued), notifications (email + push first)                                                                                                               |
| 12    | Security review, load test, WCAG 2.2 AA pass, UAT run, pilot release, runbook                                                                                                                          |

## 6. Testing

- Vitest: KPI math (zero baseline, time zone rollover, repeated breaches, absent updates, overdue tasks, notification failures)
- Playwright: the 7 UAT scenarios from the requirements doc
- k6: load and performance
- axe: accessibility
- CI authorization matrix: client denied internal comments, attendance, costs, other-tenant data

## 7. Decisions Required (week 1)

1. **Scope:** billing/invoices, opportunity pipeline, profitability in MVP or Phase 2? (Recommend Phase 2; saves about 3 weeks.)
2. **Mobile:** PWA at launch (recommended) or native iOS/Android?
3. **Hosting:** AWS from day one, or cheap Vercel/Railway/Neon pilot first?
4. **KPI weights:** who signs off the KPI dictionary; does employee progress need manager approval?
5. **Notifications:** email + in-app first, SMS/WhatsApp later?
6. Also open from the source doc: product name / white-label, attendance and geolocation policy, retention, client publication workflow.

## 8. Next Step

After decisions: scaffold the monorepo in this repo (Turborepo, Next.js app, API, Prisma schema for all core entities, design tokens, `kpi-engine` package with tests). Optionally write the ERD and KPI dictionary first for review.

## 9. Build Status (updated 2026-10-22)

Defaults from `docs/decisions/0001-default-decisions.md` are in use until the week-1 decisions are answered.

| Area                                                                                                                                          | State                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Monorepo, CI, lint/format/hooks, docker-compose                                                                                               | Done                                                                       |
| `kpi-engine` (progress, rollups, rates, deviation per spec formula, dedupe keys, time zones)                                                  | Done, tested                                                               |
| `types` (permission matrix), `validators` (zod)                                                                                               | Done, tested                                                               |
| Database: Prisma schema, migrations 0001-0004, RLS, append-only audit/baselines, login lookup policy, seed, in-process test database          | Done, tested through Prisma                                                |
| Auth: signed sessions, login throttling, TOTP MFA enrolment, deny-by-default role guard                                                       | Done on the API; web login/logout/session cookie done                      |
| Customers API (search, filters, cursor pagination, duplicate detection, archive) and UI                                                       | Done                                                                       |
| Projects, client portal (own DTOs, own-customer only), deviations + acknowledgement, audit                                                    | Done on the database                                                       |
| Worker: snapshot builder, deviation engine, notification retries, BullMQ queues                                                               | Logic done and tested; processors not yet attached to the database         |
| Web: all UX01-UX16 screens, PWA, security headers; login, customers, projects, deviations, dashboard (projects/alerts) and portal use the API | Done; tasks, My Day, attendance, chat, reports, settings still sample data |
| Tests: 142 API integration tests, 31 Playwright tests in Chrome, unit tests per package                                                       | Passing                                                                    |
| Invite and password-reset flows, role switch, field-level cost stripping                                                                      | Not started                                                                |
| Contacts, tasks and assignments, attendance, time entries, project create/baselines APIs                                                      | Not started                                                                |
| Snapshot and deviation jobs wired to the database, Redis cache                                                                                | Not started                                                                |
| WebSocket chat, file uploads + scanning, exports, email/push notifications                                                                    | Not started                                                                |
| Observability, Terraform, k6, axe                                                                                                             | Not started                                                                |
