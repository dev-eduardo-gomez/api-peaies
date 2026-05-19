import { Injectable, Logger } from '@nestjs/common';
import { AuditRepositoryPort } from '../../domain/ports/out/audit-repository.port';
import { AuditEventType } from '../../domain/model/audit-event-type.enum';

@Injectable()
export class AuditApplicationService {
  private readonly logger = new Logger(AuditApplicationService.name);

  constructor(private readonly auditRepository: AuditRepositoryPort) {}

  async logEvent(
    userId: string | null,
    eventType: AuditEventType,
    opts?: {
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    try {
      await this.auditRepository.save({
        userId,
        eventType,
        entityType: opts?.entityType ?? null,
        entityId: opts?.entityId ?? null,
        metadata: opts?.metadata ?? null,
        ipAddress: opts?.ipAddress ?? null,
        userAgent: opts?.userAgent ?? null,
      });
    } catch (error) {
      this.logger.error('Failed to persist audit event', error);
    }
  }
}
