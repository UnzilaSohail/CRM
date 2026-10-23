import { Controller, Get, Inject, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { withTenant, type PrismaClient } from '@crm/db';
import { INTERNAL_ROLES } from '@crm/types';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';
import { isoDay, projectMetrics } from '../kpi/metrics';

@Controller('projects')
export class ProjectsController {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  @Roles(...INTERNAL_ROLES)
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
      const projects = await tx.project.findMany({
        include: { customer: true, milestones: true },
        orderBy: [{ endDate: 'asc' }, { id: 'asc' }],
      });
      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        customer: p.customer.name,
        status: p.status,
        due: isoDay(p.endDate),
        baselineVersion: p.baselineVersion,
        timeZone: tenant.timeZone,
        ...projectMetrics(p.milestones, tenant.timeZone),
      }));
    });
  }

  @Roles(...INTERNAL_ROLES)
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
      const p = await tx.project.findUnique({
        where: { id },
        include: { customer: true, milestones: { orderBy: { plannedStart: 'asc' } } },
      });
      if (!p) throw new NotFoundException();
      return {
        id: p.id,
        name: p.name,
        customer: p.customer.name,
        status: p.status,
        due: isoDay(p.endDate),
        baselineVersion: p.baselineVersion,
        timeZone: tenant.timeZone,
        ...projectMetrics(p.milestones, tenant.timeZone),
        milestones: p.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          weight: Number(m.weight),
          percentComplete: Number(m.percentComplete),
          plannedStart: isoDay(m.plannedStart),
          plannedEnd: isoDay(m.plannedEnd),
          clientVisible: m.clientVisible,
        })),
      };
    });
  }
}
