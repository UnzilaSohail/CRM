# 0001 Working defaults for the week-1 decisions

Status: provisional. Built on the recommended option for each open decision in `plan.md` section 7 so work is not blocked. Revisit when the stakeholders answer.

| Decision      | Default used                                                                                                                                                                                         | Reversible? |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| MVP scope     | Billing, invoices, opportunity pipeline and profitability are Phase 2. Their module folders exist but stay empty.                                                                                    | Yes         |
| Mobile        | Responsive PWA                                                                                                                                                                                       | Yes         |
| Hosting       | Containerised, cloud-neutral. Pilot on Vercel + Railway/Fly + Neon + Upstash, AWS via Terraform later.                                                                                               | Yes         |
| KPI weights   | Per-project milestone weights; thresholds default to warning below 80% attainment and critical below 50% (`packages/kpi-engine`). Employee progress needs manager approval (modelled by `Approval`). | Config only |
| Notifications | Email and in-app first; SMS/WhatsApp later                                                                                                                                                           | Yes         |
| Geolocation   | Columns exist on `Attendance`, nullable and unused until policy is decided                                                                                                                           | Yes         |

## Enhancements made to the plan

- **Attainment, not raw gap, drives alerts.** "80% planned vs 40% actual" is 50% attainment. Planned progress is linear per milestone, inclusive of the end date, and a zero baseline never alerts.
- **Alert dedupe is a database constraint.** `Alert` has a unique `(tenantId, dedupeKey)` using `alertKey()` from `kpi-engine`, so concurrent workers cannot double-raise.
- **Baselines are append-only rows** (`Baseline`), with `Project.baselineVersion` pointing at the active one. Snapshots are keyed by baseline version.
- **Tenant time zone is stored** on `Tenant` and copied to every `KpiSnapshot`; day bucketing uses `localDate()`.
- **Visibility is explicit per row** (`clientVisible` on milestone, task, document; `internal` on chat) so the portal module can filter with one predicate.
- **Audit table is write-once by grant**, not only by convention.

## Build order from here

1. Done: monorepo, CI, `kpi-engine` with tests, Prisma schema, design tokens.
2. Next: RLS migration and partial indexes, `validators` and `types` packages, NestJS API with auth and tenancy guards, Next.js shell with login.
3. Then: roadmap weeks 3 onward as in `plan.md`.
