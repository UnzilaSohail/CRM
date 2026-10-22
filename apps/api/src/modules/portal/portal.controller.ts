import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { actualProgress } from "@crm/kpi-engine";
import { Roles } from "../../common/decorators/roles.decorator";
import { projectRecords } from "../projects/seed";

/**
 * Client portal. Own DTOs, explicit allow-list of fields, and only client_visible milestones.
 * Does not reuse the internal projects serializer so internal fields cannot leak by accident.
 */
@Controller("portal/projects")
export class PortalController {
  @Roles("CUSTOMER")
  @Get()
  list() {
    return projectRecords.map((p) => this.view(p.id));
  }

  @Roles("CUSTOMER")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.view(id);
  }

  private view(id: string) {
    const p = projectRecords.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    const published = p.milestones.filter((m) => m.clientVisible);
    return {
      id: p.id,
      name: p.name,
      due: p.due,
      progress: Math.round(actualProgress(published)),
      milestones: published.map((m) => ({
        name: m.name,
        status: m.percentComplete >= 100 ? "Done" : m.percentComplete > 0 ? "In progress" : "Not started",
      })),
    };
  }
}
