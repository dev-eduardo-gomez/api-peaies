import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TollCalculationRepositoryPort } from './domain/ports/out/toll-calculation-repository.port';
import { TollCalculationRepositoryAdapter } from './infrastructure/adapters/toll-calculation-repository.adapter';
import { TollProviderPort } from './domain/ports/out/toll-provider.port';
import { TollguruProviderAdapter } from './infrastructure/toll-provider/tollguru-provider.adapter';
import { MockTollProviderAdapter } from './infrastructure/toll-provider/mock-toll-provider.adapter';
import { LocalDbTollProviderAdapter } from './infrastructure/toll-provider/local-db-toll-provider.adapter';
import { TollguruClient } from './infrastructure/toll-provider/tollguru/tollguru.client';
import { TollguruRequestBuilder } from './infrastructure/toll-provider/tollguru/tollguru-request.builder';
import { TollguruResponseMapper } from './infrastructure/toll-provider/tollguru/tollguru-response.mapper';
import { CalculateTollUseCase } from './domain/ports/in/calculate-toll.use-case';
import { TollCalculationApplicationService } from './application/services/toll-calculation-application.service';
import { CompareRoutesUseCase } from './domain/ports/in/compare-routes.use-case';
import { RouteComparisonApplicationService } from './application/services/route-comparison-application.service';
import { GetCalculationHistoryUseCase } from './domain/ports/in/get-calculation-history.use-case';
import { CalculationHistoryApplicationService } from './application/services/calculation-history-application.service';
import { TollController } from './infrastructure/api/toll.controller';
import { HistoryController } from './infrastructure/api/history.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { CatalogModule } from '../catalogs/catalog.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 15_000 }),
    ConfigModule,
    VehiclesModule,
    CatalogModule,
  ],
  controllers: [TollController, HistoryController],
  providers: [
    // Repository
    {
      provide: TollCalculationRepositoryPort,
      useClass: TollCalculationRepositoryAdapter,
    },
    // Use cases
    {
      provide: CalculateTollUseCase,
      useClass: TollCalculationApplicationService,
    },
    {
      provide: CompareRoutesUseCase,
      useClass: RouteComparisonApplicationService,
    },
    {
      provide: GetCalculationHistoryUseCase,
      useClass: CalculationHistoryApplicationService,
    },
    // TollGuru infrastructure
    TollguruClient,
    TollguruRequestBuilder,
    TollguruResponseMapper,
    TollguruProviderAdapter,
    MockTollProviderAdapter,
    LocalDbTollProviderAdapter,
    // Dynamic provider selection based on TOLL_PROVIDER env var
    // Values: TOLLGURU | LOCAL_DB | MOCK (default)
    {
      provide: TollProviderPort,
      useFactory: (
        tollguru: TollguruProviderAdapter,
        localDb: LocalDbTollProviderAdapter,
        mock: MockTollProviderAdapter,
        config: ConfigService,
      ) => {
        const provider = config.get<string>('TOLL_PROVIDER');
        if (provider === 'TOLLGURU') return tollguru;
        if (provider === 'LOCAL_DB') return localDb;
        return mock;
      },
      inject: [
        TollguruProviderAdapter,
        LocalDbTollProviderAdapter,
        MockTollProviderAdapter,
        ConfigService,
      ],
    },
  ],
})
export class RoutingModule {}
