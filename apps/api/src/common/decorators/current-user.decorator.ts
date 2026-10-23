import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@crm/types';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: Role;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
