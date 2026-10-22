import { Controller, Get } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles("CEO", "SUPER_ADMIN")
  @Get()
  list() {
    return this.audit.list();
  }
}
