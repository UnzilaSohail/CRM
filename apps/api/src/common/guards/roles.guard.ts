import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@crm/types';
import { authSecret, verifySession } from '../../auth/token';
import type { AuthUser } from '../decorators/current-user.decorator';
import { PUBLIC_KEY, ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Deny-by-default: every endpoint needs either @Public() or @Roles(...).
 * Identity comes from a signed bearer token; an expired or tampered token is a 401, a valid token
 * whose role is not allowed is a 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly secret = authSecret();

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const allowed = this.reflector.getAllAndOverride<readonly Role[]>(ROLES_KEY, targets);
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>();

    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const result = token ? verifySession(token, this.secret) : null;
    if (!result?.ok)
      throw new UnauthorizedException(result ? `Session ${result.reason}` : undefined);

    const { sub, tid, role } = result.data;
    if (!allowed || !allowed.includes(role)) throw new ForbiddenException();
    req.user = { id: sub, tenantId: tid, role };
    return true;
  }
}
