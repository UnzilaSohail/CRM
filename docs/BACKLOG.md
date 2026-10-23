# CRM Backlog (source for Jira)

Convention: parent task `N.` = one module/phase; child `Na.` = one small, testable piece. Every child that has logic ships with its tests (Vitest unit/integration, Playwright for UI flows). "Done" = code + tests green in CI.

Jira: project `CRM` (ainetworks.atlassian.net), CRM-1 to CRM-130 created 2026-10-23, in the same order as this file (parent 1 = CRM-1, 1a = CRM-2, ... 20f = CRM-130). Labels `phase-0` to `phase-5`. Task 19 (admin settings and audit) is labelled phase-1 because roles and thresholds are needed early.

Phase 0 = Weeks 1-2, Phase 1 = 3-5, Phase 2 = 6-7, Phase 3 = 8-9, Phase 4 = 10-11, Phase 5 = 12.
P0/P1 follow the blueprint (UX IDs in brackets).

## Phase 0: Foundations

### 1. Decisions and specs (blocks coding)

- 1a. Decision record: MVP scope (billing/invoices, opportunity pipeline, profitability = Phase 2?) written to `docs/decisions/`
- 1b. Decision record: PWA vs native, hosting (AWS vs pilot stack), notification channels
- 1c. KPI dictionary v1 (every formula, weights, rounding, timezone rules) approved by product owner
- 1d. Permissions matrix: role x resource x action, including field-level gating (cost/pay) and client visibility
- 1e. ERD for all 20 entities with `tenant_id`, indexes and soft-delete/archival rules
- 1f. State machines: task, assignment approval, milestone, alert, customer approval, attendance correction
- 1g. Attendance, leave, remote and geolocation policy written down; retention and publish-workflow policy

### 2. Monorepo scaffold and tooling

- 2a. pnpm workspace + Turborepo + shared TS config; `pnpm build/lint/test` work from root
- 2b. ESLint + Prettier + commit hooks; Vitest wired in every package with one passing smoke test each
- 2c. GitHub Actions CI: install, lint, typecheck, test, build on PR; failing test blocks merge
- 2d. Docker Compose for local Postgres + Redis; `.env.example`; README quick start
- 2e. NestJS API skeleton (Fastify) with health endpoint, config validation, OpenAPI at `/docs`, e2e test
- 2f. Next.js web skeleton (App Router, Tailwind, shadcn/ui) with route groups from the folder layout
- 2g. Worker app skeleton (BullMQ) with one sample job and test

### 3. Database and tenancy

- 3a. Prisma schema: tenancy + identity entities (Tenant, User, Role, membership)
- 3b. Prisma schema: CRM + delivery entities (Customer, Contact, Opportunity, Project, Milestone, Task, Assignment)
- 3c. Prisma schema: workforce + KPI + comms entities (TimeEntry, Attendance, DailyActivity, KPI Snapshot, Alert, ChatChannel, Message, Document, Approval, AuditEvent)
- 3d. First migration + seed script (demo tenant, one user per role, sample customer/project)
- 3e. Postgres Row-Level Security policies + per-request tenant context; test: tenant A can never read tenant B
- 3f. Append-only AuditEvent writer (DB trigger or service) with test that updates/deletes are rejected

### 4. Authentication and authorization (UX01, P0)

- 4a. Login, logout, session handling (API + web) with tests
- 4b. Invite-user flow and password reset with expiring tokens
- 4c. MFA (TOTP) enrolment and challenge
- 4d. Role guard + decorator; authorization test matrix generator (role x endpoint) running in CI
- 4e. Access-denied and expired-session UI states
- 4f. Role switch for permitted users; field-level serializer that strips cost/pay for non-CEO

### 5. Design system and app shell

- 5a. Design tokens package (navy, blue, background, status colors) + automated contrast check
- 5b. Core components: buttons, inputs, badges, KPI card, data table (virtualized), progress bar, dialog, date picker
- 5c. App shell: sidebar, global search box, date/customer/project filters, notifications bell, profile menu
- 5d. State kit: empty, loading, error, permission-denied, success patterns; Storybook or gallery page
- 5e. axe accessibility check wired into Playwright for shell and components
- 5f. Clickable prototype / Figma handoff checkpoint for P0 screens (UX02 to UX13, UX16)

## Phase 1: Core delivery

### 6. Customers and contacts (UX03, UX04, P0)

- 6a. Customer CRUD API + validators, archive instead of delete, tests
- 6b. Contact CRUD + multiple contacts per customer + named portal-user link
- 6c. Search and filters (industry, country, account owner) with pg_trgm; tests
- 6d. Duplicate detection on create/import with merge suggestion; tests
- 6e. Customers list + add/edit UI
- 6f. Customer detail UI: profile, projects, contacts, communications timeline
- 6g. Interactions/meetings/files history API
- 6h. Playwright: create customer, add contact, find it by search

### 7. Projects, milestones and baselines (UX05, UX06, P0)

- 7a. Project CRUD API: scope, original and revised dates, manager, team
- 7b. Milestones with weights (must total 100%) and planned progress curve; tests for validation
- 7c. Baseline revisions: immutable versions with approval record; tests
- 7d. Project list UI with owner, due date, completion and risk filters
- 7e. Project detail UI: overview, milestones, planned vs actual, team
- 7f. Milestone timeline view
- 7g. Playwright: create project, add weighted milestones, revise baseline

### 8. Tasks and assignments (UX07, UX08, P0)

- 8a. Task CRUD API: priority, due date, estimate, dependencies (no cycles); tests
- 8b. Multiple assignees per task + assignment progress, completion evidence, review/approval flow
- 8c. Kanban board UI with optimistic drag between statuses
- 8d. List and calendar views; filters; bulk assignment
- 8e. Task detail drawer: subtasks, logs, comments, approval actions
- 8f. Reassign + approve-completion workflows with audit events
- 8g. Playwright: assign task, drag status, approve completion

### 9. Attendance, My Day, time (UX09, UX10, P0)

- 9a. Check-in/out and break API with office/remote mode; double check-in rejected; tests
- 9b. Leave requests and manager approval
- 9c. Manager-approved attendance corrections with audit trail
- 9d. Daily activity update API (accomplishments, progress, blockers, hours, next steps, attachments)
- 9e. Time entries linked to assignments with billable flag; pay never exposed
- 9f. My Day UI: priorities, check-in/out, activity feed, quick update
- 9g. Attendance UI: calendar, exceptions, leave approvals
- 9h. Playwright UAT 2: check in, log work, update task to 40%, record blocker

## Phase 2: KPI and alerts

### 10. KPI engine package (pure functions, heavily tested)

- 10a. Task progress and project progress (weighted, never plain average)
- 10b. On-time delivery, attendance rate, utilization (billable separate)
- 10c. Negative deviation formula, including zero baseline and planned <= 0
- 10d. Period bucketing with timezone and DST/day rollover; baseline-version stamping
- 10e. Property-style tests for the full edge-case list in the requirements

### 11. Snapshots, dashboard, scorecard (UX02, UX11, P0)

- 11a. Snapshot job (day/week/month) writing KPI Snapshot rows; idempotent re-runs
- 11b. Snapshot read API with drill-down to source records
- 11c. Executive dashboard UI: date filter, KPI cards, portfolio health, alerts
- 11d. KPI scorecard UI: employee / project / customer views, target vs actual
- 11e. Redis cache for dashboard aggregates with invalidation on snapshot
- 11f. Playwright UAT 1: CEO filters month and drills KPI -> customer -> project -> task -> employee

### 12. Deviation engine and alerts (UX12, P0)

- 12a. Threshold evaluation (<25 dashboard, 25-49 watch, >=50 critical) as pure function + tests
- 12b. Event pipeline: task/progress save queues recompute; dedupe key (subject, baseline, threshold, period)
- 12c. Alert record with planned/actual, threshold, baseline version, recipients, delivery status, acknowledgement, recovery owner
- 12d. Reminders and escalation schedules; re-baselining keeps immutable history
- 12e. Failure cases: notification failure retry, repeated breaches, missing updates, overdue tasks
- 12f. Deviation center UI: cause, action, acknowledge, escalate
- 12g. Playwright UAT 3: planned 80 / actual 40 sends exactly one critical sequence

## Phase 3: Client portal and collaboration

### 13. Client portal and approvals (UX13, P0)

- 13a. `client_visible` flag + publish/unpublish for tasks, milestones, documents, updates; audit
- 13b. Separate portal API module with its own DTOs; never shares queries with internal API
- 13c. Customer approval requests: decision, timestamp, comments, document version
- 13d. Portal UI: progress, milestones, documents, approvals
- 13e. Isolation test suite: client denied internal comments, attendance, costs, other-tenant data
- 13f. Playwright UAT 5 and 6

### 14. Project chat (UX14, P1)

- 14a. Channels (internal vs customer-visible) and messages API with permission checks
- 14b. Realtime gateway (Socket.IO + Redis adapter); test that portal users never join internal channels
- 14c. Task threads, @mentions, attachments, search
- 14d. Chat UI and notifications

### 15. Documents and file storage

- 15a. Presigned upload/download with S3/R2, size and type limits
- 15b. Malware scan step (ClamAV) before a file becomes available
- 15c. Document versions used by approvals

## Phase 4: Reporting, notifications, mobile

### 16. Reporting and exports (UX15, P1)

- 16a. Report filters + scheduled reports
- 16b. Queued CSV/XLSX/PDF export job; exported data matches on-screen filters (test)
- 16c. Playwright UAT 7: scorecard export keeps audit history

### 17. Notifications

- 17a. Notification service: in-app + email, preferences, retries, delivery log
- 17b. Push (web push) for PWA

### 18. Mobile and PWA (UX17, UX18, P1)

- 18a. Responsive pass at 390 / 768 / 1440; tables collapse to cards
- 18b. PWA manifest + service worker + offline queue for quick updates
- 18c. Mobile employee home and mobile manager views
- 18d. Cross-device Playwright run

### 19. Admin settings and audit (UX16, P0)

- 19a. Roles, visibility, KPI thresholds, calendars, notification settings
- 19b. Audit log viewer with filters

## Phase 5: Hardening and release

### 20. Quality, security, release

- 20a. Full role x endpoint authorization matrix green in CI
- 20b. Security review (OWASP top 10, rate limits, dependency audit)
- 20c. k6 load test against budgets (API read p95 < 200ms, LCP < 2.0s)
- 20d. WCAG 2.2 AA audit and fixes
- 20e. Terraform for dev/staging/prod, monitoring (OpenTelemetry + Sentry), backup/restore drill
- 20f. UAT run of all 7 scenarios, pilot release, runbook
