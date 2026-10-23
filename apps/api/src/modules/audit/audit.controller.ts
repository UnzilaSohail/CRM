import { Controller, Get, Inject } from '@nestjs/common';
import { withTenant, type PrismaClient } from '@crm/db';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';

@Controller('audit')
export class AuditController {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  @Roles('CEO', 'SUPER_ADMIN')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return withTenant(this.prisma, user.tenantId, (tx) =>
      tx.auditEvent.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 200 }),
    );
  }
}
