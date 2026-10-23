import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { withTenant, type PrismaClient } from '@crm/db';
import { localDate } from '@crm/kpi-engine';
import { can, rolesWith } from '@crm/types';
import { timeEntryInput, timeEntryQuery } from '@crm/validators';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';
import { AuditService } from '../audit/audit.service';
import { isoDay } from '../kpi/metrics';

const DAY_MS = 86_400_000;
const MINUTES_PER_DAY = 1440;
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Public shape: never the hourly cost of the person who logged it. */
const present = (e: {
  id: string;
  userId: string;
  taskId: string;
  day: Date;
  minutes: number;
  note: string | null;
}) => ({
  id: e.id,
  userId: e.userId,
  taskId: e.taskId,
  day: isoDay(e.day),
  minutes: e.minutes,
  note: e.note,
});

@Controller('time-entries')
export class TimeEntriesController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  /** Logs time against a task you are assigned to. One person cannot log more than 24h in a day. */
  @Roles(...rolesWith('attendance:write:self'))
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = timeEntryInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { taskId, minutes, note } = parsed.data;

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
      const today = localDate(new Date(), tenant.timeZone);
      const day = parsed.data.day ?? today;
      if (day > today) throw new BadRequestException('Cannot log time for a future day');

      // 404 for tasks the person is not assigned to: it is not theirs to see or charge time to.
      const task = await tx.task.findFirst({
        where: { id: taskId, assignments: { some: { userId: user.id } } },
      });
      if (!task) throw new NotFoundException('Task not found');
      if (task.status === 'CANCELLED') throw new BadRequestException('Task is cancelled');

      const logged = await tx.timeEntry.aggregate({
        where: { userId: user.id, day: toDate(day) },
        _sum: { minutes: true },
      });
      if ((logged._sum.minutes ?? 0) + minutes > MINUTES_PER_DAY)
        throw new ConflictException('That would be more than 24 hours on one day');

      const created = await tx.timeEntry.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          taskId,
          day: toDate(day),
          minutes,
          note: note ?? null,
        },
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'time.log',
        entityType: 'TimeEntry',
        entityId: created.id,
        diff: { taskId, minutes, day },
      });
      return present(created);
    });
  }

  /** Your own entries; leads and managers can look at anyone in the tenant. Defaults to the last 30 days. */
  @Roles(...rolesWith('attendance:read:self'))
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const parsed = timeEntryQuery.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const userId = parsed.data.userId ?? user.id;
    if (userId !== user.id && !can(user.role, 'attendance:read:team'))
      throw new ForbiddenException('You can only see your own time');

    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
      const to = parsed.data.to ?? localDate(new Date(), tenant.timeZone);
      const from = parsed.data.from ?? isoDay(new Date(toDate(to).getTime() - 30 * DAY_MS));
      const rows = await tx.timeEntry.findMany({
        where: { userId, day: { gte: toDate(from), lte: toDate(to) } },
        orderBy: [{ day: 'desc' }, { id: 'asc' }],
        take: 500,
      });
      return {
        from,
        to,
        totalMinutes: rows.reduce((sum, e) => sum + e.minutes, 0),
        items: rows.map(present),
      };
    });
  }
}
