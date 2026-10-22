import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { beforeAll, describe, expect, it } from "vitest";

const migrations = join(dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

let db: PGlite;
const asTenant = (id: string) => db.exec(`SELECT set_config('app.tenant_id','${id}',false)`);

beforeAll(async () => {
  db = new PGlite({ extensions: { pg_trgm } });
  for (const m of ["0001_init", "0002_rls_and_indexes"]) {
    await db.exec(readFileSync(join(migrations, m, "migration.sql"), "utf8"));
  }
  await db.exec(`
    INSERT INTO "Tenant"(id,name) VALUES ('${A}','A'),('${B}','B');
    INSERT INTO "Customer"(id,"tenantId",name,"nameKey")
      VALUES (gen_random_uuid(),'${A}','Acme','acme'),(gen_random_uuid(),'${B}','Beta','beta');`);
  await db.exec("SET ROLE crm_app");
});

describe("row-level security", () => {
  it("each tenant sees only its own rows", async () => {
    await asTenant(A);
    expect((await db.query<{ name: string }>('SELECT name FROM "Customer"')).rows).toEqual([{ name: "Acme" }]);
    await asTenant(B);
    expect((await db.query<{ name: string }>('SELECT name FROM "Customer"')).rows).toEqual([{ name: "Beta" }]);
  });

  it("sees nothing when no tenant is set", async () => {
    await asTenant("00000000-0000-0000-0000-000000000000");
    expect((await db.query('SELECT 1 FROM "Customer"')).rows).toHaveLength(0);
  });

  it("blocks writing a row into another tenant", async () => {
    await asTenant(A);
    await expect(
      db.exec(`INSERT INTO "Customer"(id,"tenantId",name,"nameKey") VALUES (gen_random_uuid(),'${B}','Evil','evil')`),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("append-only tables", () => {
  it("audit events can be inserted but not changed or removed", async () => {
    await asTenant(A);
    await db.exec(`INSERT INTO "AuditEvent"(id,"tenantId",action,"entityType","entityId") VALUES (gen_random_uuid(),'${A}','x','y','z')`);
    await expect(db.exec(`UPDATE "AuditEvent" SET action='tamper'`)).rejects.toThrow(/permission denied/);
    await expect(db.exec(`DELETE FROM "AuditEvent"`)).rejects.toThrow(/permission denied/);
  });
});
