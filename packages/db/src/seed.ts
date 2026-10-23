import type { PrismaClient, TaskStatus } from '@prisma/client';
import { DEMO, demoEmail } from './ids.js';
import { hashPassword } from './password.js';

const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

type M = [name: string, weight: number, pct: number, start: string, end: string, visible: boolean];

/** Idempotent demo data: one user per role, two customers, two projects with weighted milestones. */
export async function seedDemo(prisma: PrismaClient): Promise<void> {
  const passwordHash = await hashPassword(DEMO.password);

  await prisma.tenant.upsert({
    where: { id: DEMO.tenant },
    update: {},
    create: { id: DEMO.tenant, name: 'AiNetworks LLC', timeZone: 'Asia/Karachi' },
  });
  await prisma.tenant.upsert({
    where: { id: DEMO.otherTenant },
    update: {},
    create: { id: DEMO.otherTenant, name: 'Other Tenant Ltd', timeZone: 'UTC' },
  });

  const customers = [
    [DEMO.customers.meezan, 'Meezan Bank', 'Banking', 'Pakistan'],
    [DEMO.customers.amber, 'Amber Retail', 'Retail', 'Pakistan'],
  ] as const;
  for (const [id, name, industry, country] of customers) {
    await prisma.customer.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: DEMO.tenant,
        name,
        nameKey: name.toLowerCase(),
        industry,
        country,
        ownerId: DEMO.users.PROJECT_MANAGER,
      },
    });
  }

  const users = [
    ['CEO', 'Iqbal Butt'],
    ['SUPER_ADMIN', 'Sara Admin'],
    ['PROJECT_MANAGER', 'S. Khalid'],
    ['TEAM_LEAD', 'Hamza Tariq'],
    ['EMPLOYEE', 'Zara Ahmed'],
    ['CUSTOMER', 'Imran Shafiq'],
  ] as const;
  for (const [role, name] of users) {
    const id = DEMO.users[role];
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: DEMO.tenant,
        email: demoEmail(role),
        name,
        role,
        passwordHash,
        customerId: role === 'CUSTOMER' ? DEMO.customers.meezan : null,
        hourlyCost: role === 'CEO' ? null : 42,
      },
    });
  }

  const projects: [string, string, string, string, string, M[]][] = [
    [
      DEMO.projects.coreApi,
      DEMO.customers.meezan,
      'Core API migration',
      '2026-09-01',
      '2026-11-24',
      [
        ['Discovery and scoping', 20, 100, '2026-09-01', '2026-09-20', true],
        ['Environment setup', 25, 70, '2026-09-15', '2026-10-25', true],
        ['Token and auth work', 30, 20, '2026-10-10', '2026-11-10', true],
        ['Settlement endpoints', 25, 0, '2026-11-01', '2026-11-24', false],
      ],
    ],
    [
      DEMO.projects.etl,
      DEMO.customers.amber,
      'ETL data pipeline',
      '2026-09-01',
      '2026-11-10',
      [
        ['Ingestion', 40, 80, '2026-09-01', '2026-10-01', true],
        ['Transforms', 60, 10, '2026-10-01', '2026-11-10', true],
      ],
    ],
  ];
  for (const [id, customerId, name, start, end, milestones] of projects) {
    await prisma.project.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: DEMO.tenant,
        customerId,
        name,
        status: 'ACTIVE',
        startDate: date(start),
        endDate: date(end),
      },
    });
    if ((await prisma.milestone.count({ where: { projectId: id } })) === 0) {
      await prisma.milestone.createMany({
        data: milestones.map(([mName, weight, pct, s, e, visible]) => ({
          tenantId: DEMO.tenant,
          projectId: id,
          name: mName,
          weight,
          percentComplete: pct,
          plannedStart: date(s),
          plannedEnd: date(e),
          clientVisible: visible,
        })),
      });
    }
  }

  const { users: u, tasks: t, projects: p } = DEMO;
  const tasks: [id: string, projectId: string, title: string, status: TaskStatus, due: string][] = [
    [t.rotateKeys, p.coreApi, 'Rotate API signing keys', 'IN_PROGRESS', '2026-10-30'],
    [t.settlementSpec, p.coreApi, 'Write settlement endpoint spec', 'OPEN', '2026-11-05'],
    [t.loadTest, p.coreApi, 'Load test the token service', 'OPEN', '2026-11-12'],
    [t.backfill, p.etl, 'Backfill ingestion jobs', 'OPEN', '2026-10-28'],
  ];
  for (const [id, projectId, title, status, due] of tasks) {
    await prisma.task.upsert({
      where: { id },
      update: {},
      create: { id, tenantId: DEMO.tenant, projectId, title, status, dueDate: date(due) },
    });
  }
  const assignments: [taskId: string, userId: string][] = [
    [t.rotateKeys, u.EMPLOYEE],
    [t.settlementSpec, u.TEAM_LEAD],
    [t.backfill, u.EMPLOYEE],
  ];
  for (const [taskId, userId] of assignments) {
    await prisma.assignment.upsert({
      where: { taskId_userId: { taskId, userId } },
      update: {},
      create: { tenantId: DEMO.tenant, taskId, userId },
    });
  }
}
