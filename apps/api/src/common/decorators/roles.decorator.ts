import { SetMetadata } from "@nestjs/common";

export type Role = "CEO" | "SUPER_ADMIN" | "PROJECT_MANAGER" | "TEAM_LEAD" | "EMPLOYEE" | "CUSTOMER";
export const ROLES = ["CEO", "SUPER_ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "EMPLOYEE", "CUSTOMER"] as const;

export const INTERNAL_ROLES: Role[] = ["CEO", "SUPER_ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "EMPLOYEE"];
export const MANAGEMENT_ROLES: Role[] = ["CEO", "SUPER_ADMIN", "PROJECT_MANAGER"];

export const ROLES_KEY = "roles";
export const PUBLIC_KEY = "public";

/** Endpoint is reachable only by these roles. Endpoints with neither decorator are denied. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(PUBLIC_KEY, true);
