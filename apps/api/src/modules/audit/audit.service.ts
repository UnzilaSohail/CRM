import { Injectable } from "@nestjs/common";

export interface AuditRecord {
  at: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: unknown;
}

/** Append-only in memory for now; backed by the AuditEvent table (INSERT/SELECT only) once the DB is wired. */
@Injectable()
export class AuditService {
  private readonly events: AuditRecord[] = [];

  record(e: Omit<AuditRecord, "at">): void {
    this.events.push(Object.freeze({ at: new Date().toISOString(), ...e }));
  }

  list(): readonly AuditRecord[] {
    return [...this.events];
  }
}
