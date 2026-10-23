export const ROLES = [
  'CEO',
  'SUPER_ADMIN',
  'PROJECT_MANAGER',
  'TEAM_LEAD',
  'EMPLOYEE',
  'CUSTOMER',
] as const;
export type Role = (typeof ROLES)[number];

/** Resources guarded by the permission matrix (spec section 2). */
export type Permission =
  | 'portfolio:read' // company-wide dashboard, KPI, alerts
  | 'customers:read'
  | 'customers:write'
  | 'projects:read' // projects the user is assigned to
  | 'projects:write'
  | 'tasks:read'
  | 'tasks:write'
  | 'attendance:read:team'
  | 'attendance:read:self'
  | 'attendance:write:self' // check in and out
  | 'deviations:manage'
  | 'approvals:decide'
  | 'costs:read' // payroll / cost fields: CEO only
  | 'admin:manage' // tenants, users, roles, policies, audit
  | 'portal:read'; // customer portal only

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CEO: [
    'portfolio:read',
    'customers:read',
    'customers:write',
    'projects:read',
    'projects:write',
    'tasks:read',
    'tasks:write',
    'attendance:read:team',
    'attendance:read:self',
    'attendance:write:self',
    'deviations:manage',
    'approvals:decide',
    'costs:read',
  ],
  SUPER_ADMIN: ['admin:manage', 'customers:read', 'projects:read', 'tasks:read'],
  PROJECT_MANAGER: [
    'portfolio:read',
    'customers:read',
    'projects:read',
    'projects:write',
    'tasks:read',
    'tasks:write',
    'attendance:read:team',
    'attendance:read:self',
    'attendance:write:self',
    'deviations:manage',
    'approvals:decide',
  ],
  TEAM_LEAD: [
    'projects:read',
    'tasks:read',
    'tasks:write',
    'attendance:read:team',
    'attendance:read:self',
    'attendance:write:self',
  ],
  EMPLOYEE: [
    'projects:read',
    'tasks:read',
    'tasks:write',
    'attendance:read:self',
    'attendance:write:self',
  ],
  CUSTOMER: ['portal:read'],
};

export const can = (role: Role, permission: Permission) =>
  ROLE_PERMISSIONS[role].includes(permission);

export const isRole = (value: unknown): value is Role =>
  (ROLES as readonly unknown[]).includes(value);

/** Roles that may see anything internal. Customers never can. */
export const INTERNAL_ROLES: readonly Role[] = ROLES.filter((r) => r !== 'CUSTOMER');
export const MANAGEMENT_ROLES: readonly Role[] = ['CEO', 'SUPER_ADMIN', 'PROJECT_MANAGER'];

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

/** Allowed task status moves. Finished and cancelled tasks can be reopened, never skipped over. */
export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['OPEN', 'DONE', 'CANCELLED'],
  DONE: ['IN_PROGRESS'],
  CANCELLED: ['OPEN'],
};

/** Setting the same status again is a harmless no-op, not an error. */
export const canTransitionTask = (from: TaskStatus, to: TaskStatus) =>
  from === to || TASK_TRANSITIONS[from].includes(to);

/** Statuses an employee may set. Completing or cancelling needs a lead or manager (spec 4.2 review). */
export const EMPLOYEE_TASK_STATUSES: readonly TaskStatus[] = ['OPEN', 'IN_PROGRESS'];

/** Roles holding a permission; endpoint role lists derive from the matrix instead of repeating it. */
export const rolesWith = (permission: Permission): Role[] =>
  ROLES.filter((r) => can(r, permission));
