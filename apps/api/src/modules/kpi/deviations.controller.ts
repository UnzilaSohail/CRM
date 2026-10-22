import { Controller, Get } from "@nestjs/common";
import { actualProgress, alertKey, computeDeviation, localDate, plannedProgress } from "@crm/kpi-engine";
import { MANAGEMENT_ROLES, Roles } from "../../common/decorators/roles.decorator";
import { projectRecords } from "../projects/seed";

@Controller("deviations")
export class DeviationsController {
  @Roles(...MANAGEMENT_ROLES)
  @Get()
  list() {
    const today = localDate(new Date(), "Asia/Karachi");
    return projectRecords
      .map((p) => ({ p, d: computeDeviation(plannedProgress(p.milestones, today), actualProgress(p.milestones)) }))
      .filter(({ d }) => d.severity !== "none")
      .map(({ p, d }) => ({
        projectId: p.id,
        project: p.name,
        ...d,
        dedupeKey: alertKey({ subjectId: p.id, baselineVersion: p.baselineVersion, severity: d.severity as "watch" | "critical", period: today }),
      }));
  }
}
