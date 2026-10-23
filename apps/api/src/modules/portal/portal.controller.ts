import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { withTenant, type PrismaClient, type Tx } from '@crm/db';
import { actualProgress } from '@crm/kpi-engine';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';
import { isoDay, toEngineMilestone, type MilestoneRow } from '../kpi/metrics';

interface PortalRow {
  id: string;
  name: string;
  endDate: Date;
  milestones: (MilestoneRow & { name: string })[];
}

/**
 * Client portal. Own DTOs with an explicit field allow-list, only client_visible milestones, and only
 * the signed-in customer's own projects. It never reuses the internal projects queries.
 */
@Controller('portal/projects')
export class PortalController {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  private async customerIdOf(tx: Tx, user: AuthUser): Promise<string> {
    const row = await tx.user.findUnique({
      where: { id: user.id },
      select: { customerId: true, active: true },
    });
    if (!row?.active || !row.customerId) throw new ForbiddenException();
    return row.customerId;
  }

  private view(p: PortalRow) {
    return {
      id: p.id,
      name: p.name,
      due: isoDay(p.endDate),
      progress: Math.round(actualProgress(p.milestones.map(toEngineMilestone))),
      milestones: p.milestones.map((m) => ({
        name: m.name,
        status:
          Number(m.percentComplete) >= 100
            ? 'Done'
            : Number(m.percentComplete) > 0
              ? 'In progress'
              : 'Not started',
      })),
    };
  }

  @Roles('CUSTOMER')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const customerId = await this.customerIdOf(tx, user);
      const projects = await tx.project.findMany({
        where: { customerId },
        select: {
          id: true,
          name: true,
          endDate: true,
          milestones: {
            where: { clientVisible: true },
            orderBy: { plannedStart: 'asc' },
            select: {
              name: true,
              weight: true,
              percentComplete: true,
              plannedStart: true,
              plannedEnd: true,
            },
          },
        },
        orderBy: { endDate: 'asc' },
      });
      return projects.map((p) => this.view(p));
    });
  }

  @Roles('CUSTOMER')
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const customerId = await this.customerIdOf(tx, user);
      const p = await tx.project.findFirst({
        where: { id, customerId },
        select: {
          id: true,
          name: true,
          endDate: true,
          milestones: {
            where: { clientVisible: true },
            orderBy: { plannedStart: 'asc' },
            select: {
              name: true,
              weight: true,
              percentComplete: true,
              plannedStart: true,
              plannedEnd: true,
            },
          },
        },
      });
      if (!p) throw new NotFoundException();
      return this.view(p);
    });
  }
}
