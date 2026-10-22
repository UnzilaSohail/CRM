import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isRole, type Role } from "@crm/types";
import { PUBLIC_KEY, ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Deny-by-default role check.
 * Placeholder identity: the `x-demo-role` header. Replace with verified session/JWT claims
 * (role, tenant_id) when auth lands; the guard contract stays the same.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const allowed = this.reflector.getAllAndOverride<readonly Role[]>(ROLES_KEY, targets);
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: { role: Role } }>();
    const role = req.headers["x-demo-role"];

    if (!isRole(role)) throw new UnauthorizedException();
    if (!allowed || !allowed.includes(role)) throw new ForbiddenException();
    req.user = { role };
    return true;
  }
}
