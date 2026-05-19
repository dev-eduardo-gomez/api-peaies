import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AuditRepositoryPort } from '../../domain/ports/out/audit-repository.port';
import { AuditEvent } from '../../domain/model/audit-event.model';
import { AUDIT_QUERIES } from '../persistence/audit.queries';

@Injectable()
export class AuditRepositoryAdapter extends AuditRepositoryPort {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
  ) {
    super();
  }

  async save(event: Omit<AuditEvent, 'id' | 'occurredAt'>): Promise<void> {
    await this.em.query(AUDIT_QUERIES.INSERT_EVENT, [
      event.userId,
      event.eventType,
      event.entityType,
      event.entityId,
      event.ipAddress,
      event.userAgent,
      event.metadata ? JSON.stringify(event.metadata) : null,
    ]);
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AuditEvent[]; total: number }> {
    const offset = (page - 1) * limit;

    const [rows, countRows] = await Promise.all([
      this.em.query(AUDIT_QUERIES.FIND_BY_USER, [userId, limit, offset]),
      this.em.query(AUDIT_QUERIES.COUNT_BY_USER, [userId]),
    ]);

    return {
      data: rows.map((row: any) => this.toDomain(row)),
      total: countRows[0].total,
    };
  }

  private toDomain(row: any): AuditEvent {
    return {
      id: String(row.id),
      userId: row.user_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      occurredAt: row.occurred_at,
    };
  }
}
