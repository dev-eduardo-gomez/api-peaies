import { AuditEvent } from '../../model/audit-event.model';

export abstract class AuditRepositoryPort {
  abstract save(
    event: Omit<AuditEvent, 'id' | 'occurredAt'>,
  ): Promise<void>;

  abstract findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AuditEvent[]; total: number }>;
}
