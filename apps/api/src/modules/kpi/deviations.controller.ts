import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { withTenant, type PrismaClient } from '@crm/db';
import { alertKey } from '@crm/kpi-engine';
import { rolesWith } from '@crm/types';
import { deviationAckInput } from '@crm/validators';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';
import { AuditService } from '../audit/audit.service';
import { projectMetrics } from './metrics';

const MANAGE = rolesWith('deviations:manage');

@Controller('deviations')
export class DeviationsController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  @Roles(...MANAGE)
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
      const projects = await tx.project.findMany({
        where: { status: 'ACTIVE' },
        include: { milestones: true, customer: true },
      });
      const rows = projects
        .map((p) => ({ p, m: projectMetrics(p.milestones, tenant.timeZone) }))
        .filter(({ m }) => m.severity !== 'none')
        .map(({ p, m }) => ({
          projectId: p.id,
          project: p.name,
          customer: p.customer.name,
          planned: m.planned,
          actual: m.actual,
          negativeDeviation: m.negativeDeviation,
          severity: m.severity as 'watch' | 'critical',
          dedupeKey: alertKey({
            subjectId: p.id,
            baselineVersion: p.baselineVersion,
            severity: m.severity as 'watch' | 'critical',
            period: m.today,
          }),
        }));
      const acked = await tx.alert.findMany({
        where: { dedupeKey: { in: rows.map((r) => r.dedupeKey) }, acknowledgedAt: { not: null } },
        select: { dedupeKey: true, cause: true },
      });
      const byKey = new Map(acked.map((a) => [a.dedupeKey, a.cause]));
      return rows
        .map((r) => ({
          ...r,
          acknowledged: byKey.has(r.dedupeKey),
          cause: byKey.get(r.dedupeKey) ?? null,
        }))
        .sort((a, b) => b.negativeDeviation - a.negativeDeviation);
    });
  }

  /** Critical deviations require a cause. The alert row and its audit event commit together. */
  @Roles(...MANAGE)
  @Post(':projectId/acknowledge')
  acknowledge(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: unknown,
  ) {
    const parsed = deviationAckInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
      const p = await tx.project.findUnique({
        where: { id: projectId },
        include: { milestones: true },
      });
      if (!p) throw new NotFoundException();

      const m = projectMetrics(p.milestones, tenant.timeZone);
      if (m.severity === 'none') throw new BadRequestException('No active deviation');
      if (parsed.data.severity !== m.severity) {
        throw new BadRequestException(`Current severity is ${m.severity}`);
      }

      const dedupeKey = alertKey({
        subjectId: p.id,
        baselineVersion: p.baselineVersion,
        severity: m.severity,
        period: m.today,
      });
      const existing = await tx.alert.findUnique({
        where: { tenantId_dedupeKey: { tenantId: user.tenantId, dedupeKey } },
      });
      if (existing?.acknowledgedAt) throw new ConflictException('Already acknowledged');

      const data = {
        state: 'ACKNOWLEDGED' as const,
        acknowledgedAt: new Date(),
        acknowledgedBy: user.id,
        cause: parsed.data.cause || null,
      };
      await tx.alert.upsert({
        where: { tenantId_dedupeKey: { tenantId: user.tenantId, dedupeKey } },
        update: data,
        create: {
          ...data,
          tenantId: user.tenantId,
          projectId: p.id,
          severity: m.severity === 'critical' ? 'CRITICAL' : 'WATCH',
          dedupeKey,
          baselineVersion: p.baselineVersion,
          message: `${p.name}: planned ${m.planned.toFixed(0)}%, actual ${m.actual.toFixed(0)}%`,
        },
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'deviation.acknowledge',
        entityType: 'Project',
        entityId: p.id,
        diff: {
          severity: m.severity,
          negativeDeviation: m.negativeDeviation,
          cause: parsed.data.cause,
          baselineVersion: p.baselineVersion,
        },
      });
      return { acknowledged: true, dedupeKey };
    });
  }
}
