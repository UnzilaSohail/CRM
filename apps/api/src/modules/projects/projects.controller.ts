import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { actualProgress, computeDeviation, localDate, plannedProgress } from '@crm/kpi-engine';
import { INTERNAL_ROLES, Roles } from '../../common/decorators/roles.decorator';
import { projectRecords, type ProjectRecord } from './seed';

const TIME_ZONE = 'Asia/Karachi';

function toDto(p: ProjectRecord) {
  const today = localDate(new Date(), TIME_ZONE);
  const planned = plannedProgress(p.milestones, today);
  const actual = actualProgress(p.milestones);
  return {
    id: p.id,
    name: p.name,
    customer: p.customer,
    manager: p.manager,
    due: p.due,
    baselineVersion: p.baselineVersion,
    internalNotes: p.internalNotes,
    asOf: today,
    timeZone: TIME_ZONE,
    ...computeDeviation(planned, actual),
  };
}

@Controller('projects')
export class ProjectsController {
  @Roles(...INTERNAL_ROLES)
  @Get()
  list() {
    return projectRecords.map(toDto);
  }

  @Roles(...INTERNAL_ROLES)
  @Get(':id')
  get(@Param('id') id: string) {
    const p = projectRecords.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return { ...toDto(p), milestones: p.milestones };
  }
}
