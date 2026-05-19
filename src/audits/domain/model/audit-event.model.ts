import { AuditEventType } from './audit-event-type.enum';

export interface AuditEvent {
  id: string;
  userId: string | null;
  eventType: AuditEventType;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
}
