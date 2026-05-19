import { Module } from '@nestjs/common';
import { CatalogController } from './infrastructure/api/catalog.controller';
import { CatalogRepositoryPort } from './domain/ports/out/catalog-repository.port';
import { CatalogRepositoryAdapter } from './infrastructure/adapters/catalog-repository.adapter';
import { CatalogServicePort } from './domain/ports/in/catalog-service.port';
import { CatalogApplicationService } from './application/services/catalog-application.service';

@Module({
  imports: [],
  controllers: [CatalogController],
  providers: [
    {
      provide: CatalogRepositoryPort,
      useClass: CatalogRepositoryAdapter,
    },
    {
      provide: CatalogServicePort,
      useClass: CatalogApplicationService,
    },
  ],
  exports: [CatalogRepositoryPort],
})
export class CatalogModule {}
