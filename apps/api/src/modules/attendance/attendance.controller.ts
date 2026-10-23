import { ConflictException, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { withTenant, type PrismaClient, type Tx } from '@crm/db';
import { localDate } from '@crm/kpi-engine';
import { rolesWith } from '@crm/types';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PRISMA } from '../../data/data.module';
import { AuditService } from '../audit/audit.service';

const READ_SELF = rolesWith('attendance:read:self');
const WRITE_SELF = rolesWith('attendance:write:self');

interface Today {
  day: string;
  checkIn: string | null;
  checkOut: string | null;
}

@Controller('attendance')
export class AttendanceController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  /** "Today" is the calendar day in the tenant time zone, so a night shift never splits across days. */
  private async today(tx: Tx, tenantId: string, now = new Date()) {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const day = localDate(now, tenant.timeZone);
    return { day, date: new Date(`${day}T00:00:00Z`) };
  }

  @Roles(...READ_SELF)
  @Get('today')
  today_(@CurrentUser() user: AuthUser): Promise<Today> {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const { day, date } = await this.today(tx, user.tenantId);
      const row = await tx.attendance.findUnique({
        where: { userId_day: { userId: user.id, day: date } },
      });
      return {
        day,
        checkIn: row?.checkIn.toISOString() ?? null,
        checkOut: row?.checkOut?.toISOString() ?? null,
      };
    });
  }

  @Roles(...WRITE_SELF)
  @Post('check-in')
  checkIn(@CurrentUser() user: AuthUser): Promise<Today> {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const now = new Date();
      const { day, date } = await this.today(tx, user.tenantId, now);
      const existing = await tx.attendance.findUnique({
        where: { userId_day: { userId: user.id, day: date } },
      });
      if (existing) throw new ConflictException('Already checked in today');

      const row = await tx.attendance.create({
        data: { tenantId: user.tenantId, userId: user.id, day: date, checkIn: now },
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'attendance.check_in',
        entityType: 'Attendance',
        entityId: row.id,
        diff: { day },
      });
      return { day, checkIn: row.checkIn.toISOString(), checkOut: null };
    });
  }

  @Roles(...WRITE_SELF)
  @HttpCode(200)
  @Post('check-out')
  checkOut(@CurrentUser() user: AuthUser): Promise<Today> {
    return withTenant(this.prisma, user.tenantId, async (tx) => {
      const now = new Date();
      const { day, date } = await this.today(tx, user.tenantId, now);
      const existing = await tx.attendance.findUnique({
        where: { userId_day: { userId: user.id, day: date } },
      });
      if (!existing) throw new ConflictException('You have not checked in today');
      if (existing.checkOut) throw new ConflictException('Already checked out today');

      const row = await tx.attendance.update({
        where: { id: existing.id },
        data: { checkOut: now },
      });
      await this.audit.record(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'attendance.check_out',
        entityType: 'Attendance',
        entityId: row.id,
        diff: { day },
      });
      return { day, checkIn: row.checkIn.toISOString(), checkOut: row.checkOut!.toISOString() };
    });
  }
}
