import { SetMetadata } from "@nestjs/common";
import { INTERNAL_ROLES, MANAGEMENT_ROLES, ROLES, type Role } from "@crm/types";

export { INTERNAL_ROLES, MANAGEMENT_ROLES, ROLES };
export type { Role };

export const ROLES_KEY = "roles";
export const PUBLIC_KEY = "public";

/** Endpoint is reachable only by these roles. Endpoints with neither decorator are denied. */
export const Roles = (...roles: readonly Role[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(PUBLIC_KEY, true);
