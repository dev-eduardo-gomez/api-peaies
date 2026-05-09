import { Module } from '@nestjs/common';
import { BoothController } from './infrastructure/api/booth.controller';
import { BoothRepositoryPort } from './domain/ports/out/booth-repository.port';
import { BoothRepositoryAdapter } from './infrastructure/adapters/booth-repository.adapter';
import { BoothCatalogServicePort } from './domain/ports/in/booth-catalog-service.port';
import { BoothCatalogApplicationService } from './application/services/booth-catalog-application.service';

@Module({
  imports: [],
  controllers: [BoothController],
  providers: [
    {
      provide: BoothRepositoryPort,
      useClass: BoothRepositoryAdapter,
    },
    {
      provide: BoothCatalogServicePort,
      useClass: BoothCatalogApplicationService,
    },
  ],
  exports: [BoothCatalogServicePort, BoothRepositoryPort],
})
export class BoothModule {}
