-- Tenant isolation, append-only audit, and partial/search indexes that Prisma cannot express.
-- The API sets the tenant per transaction:  SELECT set_config('app.tenant_id', '<uuid>', true);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Application role: no BYPASSRLS, not the table owner (owners bypass RLS unless FORCE is set; we also FORCE).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_app') THEN
    CREATE ROLE crm_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_app;

-- Row-Level Security on every table carrying "tenantId".
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Customer','Contact','Project','Baseline','Milestone','Task','Assignment',
    'Attendance','TimeEntry','DailyActivity','KpiSnapshot','Alert','Approval',
    'Document','ChatMessage','Notification','AuditEvent'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;
END $$;

-- Tenant table: a session only sees its own tenant row.
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON "Tenant" USING ("id" = current_setting('app.tenant_id', true)::uuid);

-- Audit log is append-only: the application role may only read and insert.
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditEvent" FROM crm_app;

-- Baselines are immutable once written.
REVOKE UPDATE, DELETE ON "Baseline" FROM crm_app;

-- Partial indexes for hot paths.
CREATE INDEX "Task_open_idx" ON "Task" ("tenantId", "projectId", "dueDate") WHERE "status" IN ('OPEN', 'IN_PROGRESS');
CREATE INDEX "Alert_active_idx" ON "Alert" ("tenantId", "projectId", "createdAt") WHERE "state" <> 'RESOLVED';
CREATE INDEX "Notification_unread_idx" ON "Notification" ("tenantId", "userId", "createdAt") WHERE "readAt" IS NULL;

-- Search and customer de-duplication.
CREATE INDEX "Customer_name_trgm_idx" ON "Customer" USING gin ("nameKey" gin_trgm_ops);
CREATE INDEX "Project_name_trgm_idx" ON "Project" USING gin ("name" gin_trgm_ops);
CREATE INDEX "Task_title_fts_idx" ON "Task" USING gin (to_tsvector('simple', "title"));
