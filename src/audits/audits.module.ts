import { Module } from '@nestjs/common';
import { AuditRepositoryPort } from './domain/ports/out/audit-repository.port';
import { AuditRepositoryAdapter } from './infrastructure/adapters/audit-repository.adapter';
import { AuditApplicationService } from './application/services/audit-application.service';

@Module({
  providers: [
    {
      provide: AuditRepositoryPort,
      useClass: AuditRepositoryAdapter,
    },
    AuditApplicationService,
  ],
  exports: [AuditApplicationService],
})
export class AuditsModule {}
