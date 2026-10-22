export const ROLES = ["CEO", "SUPER_ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "EMPLOYEE", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

/** Resources guarded by the permission matrix (spec section 2). */
export type Permission =
  | "portfolio:read"        // company-wide dashboard, KPI, alerts
  | "customers:read"
  | "customers:write"
  | "projects:read"         // projects the user is assigned to
  | "projects:write"
  | "tasks:read"
  | "tasks:write"
  | "attendance:read:team"
  | "attendance:read:self"
  | "deviations:manage"
  | "approvals:decide"
  | "costs:read"            // payroll / cost fields: CEO only
  | "admin:manage"          // tenants, users, roles, policies, audit
  | "portal:read";          // customer portal only

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CEO: ["portfolio:read", "customers:read", "customers:write", "projects:read", "projects:write", "tasks:read",
    "tasks:write", "attendance:read:team", "attendance:read:self", "deviations:manage", "approvals:decide", "costs:read"],
  SUPER_ADMIN: ["admin:manage", "customers:read", "projects:read", "tasks:read"],
  PROJECT_MANAGER: ["portfolio:read", "customers:read", "projects:read", "projects:write", "tasks:read", "tasks:write",
    "attendance:read:team", "attendance:read:self", "deviations:manage", "approvals:decide"],
  TEAM_LEAD: ["projects:read", "tasks:read", "tasks:write", "attendance:read:team", "attendance:read:self"],
  EMPLOYEE: ["projects:read", "tasks:read", "tasks:write", "attendance:read:self"],
  CUSTOMER: ["portal:read"],
};

export const can = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role].includes(permission);

export const isRole = (value: unknown): value is Role => (ROLES as readonly unknown[]).includes(value);

/** Roles that may see anything internal. Customers never can. */
export const INTERNAL_ROLES: readonly Role[] = ROLES.filter((r) => r !== "CUSTOMER");
export const MANAGEMENT_ROLES: readonly Role[] = ["CEO", "SUPER_ADMIN", "PROJECT_MANAGER"];

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
