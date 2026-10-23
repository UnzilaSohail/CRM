import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  actualProgress,
  alertKey,
  computeDeviation,
  localDate,
  plannedProgress,
} from '@crm/kpi-engine';
import { deviationAckInput } from '@crm/validators';
import { MANAGEMENT_ROLES, Roles, type Role } from '../../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { projectRecords } from '../projects/seed';

const TIME_ZONE = 'Asia/Karachi';

@Controller('deviations')
export class DeviationsController {
  private readonly acknowledged = new Map<string, { cause: string; at: string }>();

  constructor(private readonly audit: AuditService) {}

  private current(p: (typeof projectRecords)[number]) {
    const today = localDate(new Date(), TIME_ZONE);
    const d = computeDeviation(plannedProgress(p.milestones, today), actualProgress(p.milestones));
    return { today, d };
  }

  @Roles(...MANAGEMENT_ROLES)
  @Get()
  list() {
    return projectRecords
      .map((p) => ({ p, ...this.current(p) }))
      .filter(({ d }) => d.severity !== 'none')
      .map(({ p, d, today }) => {
        const dedupeKey = alertKey({
          subjectId: p.id,
          baselineVersion: p.baselineVersion,
          severity: d.severity as 'watch' | 'critical',
          period: today,
        });
        return {
          projectId: p.id,
          project: p.name,
          ...d,
          dedupeKey,
          acknowledged: this.acknowledged.has(dedupeKey),
        };
      });
  }

  /** Critical deviations require a cause (validators). Every acknowledgement is audited. */
  @Roles(...MANAGEMENT_ROLES)
  @Post(':projectId/acknowledge')
  acknowledge(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: { user: { role: Role } },
  ) {
    const p = projectRecords.find((x) => x.id === projectId);
    if (!p) throw new NotFoundException();

    const parsed = deviationAckInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const { d, today } = this.current(p);
    if (d.severity === 'none') throw new BadRequestException('No active deviation');
    if (parsed.data.severity !== d.severity)
      throw new BadRequestException(`Current severity is ${d.severity}`);

    const key = alertKey({
      subjectId: p.id,
      baselineVersion: p.baselineVersion,
      severity: d.severity,
      period: today,
    });
    this.acknowledged.set(key, { cause: parsed.data.cause, at: new Date().toISOString() });
    this.audit.record({
      actorRole: req.user.role,
      action: 'deviation.acknowledge',
      entityType: 'Project',
      entityId: p.id,
      detail: {
        severity: d.severity,
        negativeDeviation: d.negativeDeviation,
        cause: parsed.data.cause,
        baselineVersion: p.baselineVersion,
      },
    });
    return { acknowledged: true, dedupeKey: key };
  }
}
