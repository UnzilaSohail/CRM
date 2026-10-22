import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "./common/guards/roles.guard";
import { HealthController } from "./health.controller";
import { ProjectsController } from "./modules/projects/projects.controller";
import { PortalController } from "./modules/portal/portal.controller";
import { DeviationsController } from "./modules/kpi/deviations.controller";

@Module({
  controllers: [HealthController, ProjectsController, PortalController, DeviationsController],
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
