# Entity relationship diagram

Source of truth: `packages/db/prisma/schema.prisma`. Every tenant-owned table carries `tenantId` and is protected by Row-Level Security (`0002_rls_and_indexes`).

```mermaid
erDiagram
  Tenant ||--o{ User : has
  Tenant ||--o{ Customer : has
  Tenant ||--o{ Project : has
  Customer ||--o{ Contact : has
  Customer ||--o{ Project : owns
  Customer ||--o{ User : "portal users"
  Project ||--o{ Milestone : plans
  Project ||--o{ Baseline : "versions (immutable)"
  Project ||--o{ Task : contains
  Milestone ||--o{ Task : groups
  Task ||--o{ Assignment : "assigned via"
  User ||--o{ Assignment : receives
  User ||--o{ Attendance : logs
  User ||--o{ TimeEntry : logs
  Task ||--o{ TimeEntry : "time on"
  User ||--o{ DailyActivity : posts
  Project ||--o{ KpiSnapshot : "daily/weekly/monthly"
  Project ||--o{ Alert : raises
  Project ||--o{ Approval : requests
  Project ||--o{ Document : stores
  Project ||--o{ ChatMessage : discusses
  User ||--o{ ChatMessage : writes
```

Not in the schema yet (Phase 2 or later): Opportunity, ChatChannel (messages are per project for now), leave requests, breaks, task dependencies and subtasks.

## Visibility rules encoded in the schema

- `Milestone.clientVisible`, `Task.clientVisible`, `Document.clientVisible`: default false. Publication is explicit.
- `ChatMessage.internal`: default true. The portal module never returns internal messages.
- `User.hourlyCost`: serializers strip it for every role except CEO.
- `AuditEvent` and `Baseline`: the application database role has no UPDATE or DELETE grant.
