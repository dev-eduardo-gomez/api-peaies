import { Module } from '@nestjs/common';
import { VehicleRepositoryPort } from './domain/ports/out/vehicle-repository.port';
import { VehicleRepositoryAdapter } from './infrastructure/adapters/vehicle-repository.adapter';
import { VehicleServicePort } from './domain/ports/in/vehicle-service.port';
import { VehicleApplicationService } from './application/services/vehicle-application.service';
import { VehicleController } from './infrastructure/api/vehicle.controller';

@Module({
  imports: [],
  controllers: [VehicleController],
  providers: [
    {
      provide: VehicleRepositoryPort,
      useClass: VehicleRepositoryAdapter,
    },
    {
      provide: VehicleServicePort,
      useClass: VehicleApplicationService,
    },
  ],
  exports: [VehicleRepositoryPort, VehicleServicePort],
})
export class VehiclesModule {}
