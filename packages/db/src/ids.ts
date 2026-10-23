/** Deterministic ids for the demo tenant so tests, seeds and docs agree. */
export const DEMO = {
  tenant: '00000000-0000-4000-8000-000000000001',
  otherTenant: '00000000-0000-4000-8000-000000000002',
  /** Development-only password shared by every seeded user. */
  password: 'Passw0rd!demo',
  users: {
    CEO: '10000000-0000-4000-8000-000000000001',
    SUPER_ADMIN: '10000000-0000-4000-8000-000000000002',
    PROJECT_MANAGER: '10000000-0000-4000-8000-000000000003',
    TEAM_LEAD: '10000000-0000-4000-8000-000000000004',
    EMPLOYEE: '10000000-0000-4000-8000-000000000005',
    CUSTOMER: '10000000-0000-4000-8000-000000000006',
  },
  customers: {
    meezan: '20000000-0000-4000-8000-000000000001',
    amber: '20000000-0000-4000-8000-000000000002',
  },
  projects: {
    coreApi: '30000000-0000-4000-8000-000000000001',
    etl: '30000000-0000-4000-8000-000000000002',
  },
  tasks: {
    /** coreApi, in progress, assigned to the employee. */
    rotateKeys: '40000000-0000-4000-8000-000000000001',
    /** coreApi, open, assigned to the team lead. */
    settlementSpec: '40000000-0000-4000-8000-000000000002',
    /** coreApi, open, nobody assigned. */
    loadTest: '40000000-0000-4000-8000-000000000003',
    /** etl, open, assigned to the employee. */
    backfill: '40000000-0000-4000-8000-000000000004',
  },
} as const;

export const demoEmail = (role: keyof typeof DEMO.users) =>
  `${role.toLowerCase().replace('_', '.')}@ainetworks.test`;
