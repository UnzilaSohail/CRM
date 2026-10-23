import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { PrismaClient } from '@crm/db';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { RolesGuard } from './common/guards/roles.guard';
import { DataModule } from './data/data.module';
import { HealthController } from './health.controller';
import { AttendanceController } from './modules/attendance/attendance.controller';
import { AuditController } from './modules/audit/audit.controller';
import { AuditService } from './modules/audit/audit.service';
import { CustomersController } from './modules/customers/customers.controller';
import { DeviationsController } from './modules/kpi/deviations.controller';
import { PortalController } from './modules/portal/portal.controller';
import { ProjectsController } from './modules/projects/projects.controller';
import { TasksController } from './modules/tasks/tasks.controller';
import { TimeEntriesController } from './modules/time-entries/time-entries.controller';

@Module({
  controllers: [
    HealthController,
    AuthController,
    CustomersController,
    ProjectsController,
    TasksController,
    AttendanceController,
    TimeEntriesController,
    PortalController,
    DeviationsController,
    AuditController,
  ],
  providers: [AuditService, AuthService, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {
  static register(prisma: PrismaClient): DynamicModule {
    return { module: AppModule, imports: [DataModule.register(prisma)] };
  }
}
