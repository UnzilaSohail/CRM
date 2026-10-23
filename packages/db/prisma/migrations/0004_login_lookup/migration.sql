-- Login happens before the tenant is known. This policy lets a session read exactly the User row(s)
-- whose email equals app.auth_email (set by the API for the duration of one transaction); nothing else.
-- Policies are permissive and OR together with the tenant_isolation policy.
CREATE POLICY auth_lookup ON "User" FOR SELECT
  USING (lower("email") = current_setting('app.auth_email', true));

-- An unset or reset setting reads as '' (not NULL); casting '' to uuid raises. Treat it as "no tenant".
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Customer','Contact','Project','Baseline','Milestone','Task','Assignment',
    'Attendance','TimeEntry','DailyActivity','KpiSnapshot','Alert','Approval',
    'Document','ChatMessage','Notification','AuditEvent'
  ] LOOP
    EXECUTE format('DROP POLICY tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      t);
  END LOOP;
END $$;

DROP POLICY tenant_self ON "Tenant";
CREATE POLICY tenant_self ON "Tenant" USING ("id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
