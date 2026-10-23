import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEMO,
  findUserForLogin,
  seedDemo,
  verifyPassword,
  withTenant,
  type PrismaClient,
} from '../src/index.js';
import { createTestPrisma, type TestPrisma } from '../src/testing.js';

let t: TestPrisma;
let prisma: PrismaClient;

beforeAll(async () => {
  t = await createTestPrisma();
  prisma = t.prisma;
  await seedDemo(prisma);
});
afterAll(() => t.close());

describe('seed', () => {
  it('creates one user per role with a verifiable password', async () => {
    const users = await prisma.user.findMany({ where: { tenantId: DEMO.tenant } });
    expect(users.map((u) => u.role).sort()).toEqual(
      ['CEO', 'CUSTOMER', 'EMPLOYEE', 'PROJECT_MANAGER', 'SUPER_ADMIN', 'TEAM_LEAD'].sort(),
    );
    expect(await verifyPassword(DEMO.password, users[0]!.passwordHash)).toBe(true);
    expect(await verifyPassword('wrong', users[0]!.passwordHash)).toBe(false);
  });

  it('is idempotent', async () => {
    await seedDemo(prisma);
    expect(await prisma.milestone.count({ where: { projectId: DEMO.projects.coreApi } })).toBe(4);
  });
});

describe('withTenant (Prisma + RLS)', () => {
  it('only returns the current tenant rows, even without a tenant filter in the query', async () => {
    await prisma.customer.create({
      data: { tenantId: DEMO.otherTenant, name: 'Foreign Co', nameKey: 'foreign co' },
    });
    const mine = await withTenant(prisma, DEMO.tenant, (tx) => tx.customer.findMany());
    expect(mine.map((c) => c.name).sort()).toEqual(['Amber Retail', 'Meezan Bank']);
    const theirs = await withTenant(prisma, DEMO.otherTenant, (tx) => tx.customer.findMany());
    expect(theirs.map((c) => c.name)).toEqual(['Foreign Co']);
  });

  it('refuses to write a row into another tenant', async () => {
    await expect(
      withTenant(prisma, DEMO.tenant, (tx) =>
        tx.customer.create({ data: { tenantId: DEMO.otherTenant, name: 'Evil', nameKey: 'evil' } }),
      ),
    ).rejects.toThrow();
  });

  it('cannot update or delete audit events through the application role', async () => {
    await withTenant(prisma, DEMO.tenant, (tx) =>
      tx.auditEvent.create({
        data: { tenantId: DEMO.tenant, action: 'x', entityType: 'T', entityId: '1' },
      }),
    );
    await expect(
      withTenant(prisma, DEMO.tenant, (tx) =>
        tx.auditEvent.updateMany({ data: { action: 'tamper' } }),
      ),
    ).rejects.toThrow();
    await expect(
      withTenant(prisma, DEMO.tenant, (tx) => tx.auditEvent.deleteMany()),
    ).rejects.toThrow();
  });
});

describe('findUserForLogin', () => {
  it('finds a user by email without a tenant context', async () => {
    const u = await findUserForLogin(prisma, 'CEO@ainetworks.test');
    expect(u?.id).toBe(DEMO.users.CEO);
    expect(u?.tenantId).toBe(DEMO.tenant);
  });

  it('returns null for unknown emails', async () => {
    expect(await findUserForLogin(prisma, 'nobody@example.com')).toBeNull();
  });

  it('the auth policy exposes only the matching row, never the whole table', async () => {
    await t.pg.exec('SET ROLE crm_app');
    await t.pg.exec("SELECT set_config('app.tenant_id', '', false)");
    await t.pg.exec("SELECT set_config('app.auth_email', 'ceo@ainetworks.test', false)");
    const rows = await t.pg.query('SELECT email FROM "User"');
    await t.pg.exec('RESET ROLE');
    expect(rows.rows).toEqual([{ email: 'ceo@ainetworks.test' }]);
  });
});
