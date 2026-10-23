import { Injectable } from '@nestjs/common';
import type { Prisma, Tx } from '@crm/db';

export interface AuditInput {
  tenantId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  diff?: Prisma.InputJsonValue;
}

/** Append-only: writes inside the caller transaction so the audit row commits or rolls back with the change. */
@Injectable()
export class AuditService {
  record(tx: Tx, e: AuditInput) {
    return tx.auditEvent.create({
      data: {
        tenantId: e.tenantId,
        actorId: e.actorId ?? null,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        diff: e.diff,
      },
    });
  }
}
