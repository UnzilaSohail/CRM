import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PUBLIC_KEY, ROLES, ROLES_KEY, type Role } from "../decorators/roles.decorator";

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

    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const role = req.headers["x-demo-role"] as Role | undefined;

    if (!role || !(ROLES as readonly string[]).includes(role)) throw new UnauthorizedException();
    if (!allowed || !allowed.includes(role)) throw new ForbiddenException();
    return true;
  }
}
