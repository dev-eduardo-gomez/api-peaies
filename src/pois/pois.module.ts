import { Module } from '@nestjs/common';
import { PoiApplicationService } from './application/services/poi-application.service';
import { PoiServicePort } from './domain/ports/in/poi-service.port';
import { PoiRepositoryPort } from './domain/ports/out/poi-repository.port';
import { PoiRepositoryAdapter } from './infrastructure/adapters/poi-repository.adapter';
import { RouteEnrichmentApplicationService } from './application/services/route-enrichment-application.service';
import { PoiController } from './infrastructure/api/poi.controller';

@Module({
  imports: [],
  controllers: [PoiController],
  providers: [
    {
      provide: PoiServicePort,
      useClass: PoiApplicationService,
    },
    {
      provide: PoiRepositoryPort,
      useClass: PoiRepositoryAdapter,
    },
    RouteEnrichmentApplicationService,
  ],
  exports: [PoiServicePort, RouteEnrichmentApplicationService],
})
export class PoisModule {}
