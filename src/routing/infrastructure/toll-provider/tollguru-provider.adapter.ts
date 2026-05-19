import { Inject, Injectable } from '@nestjs/common';
import { TollProviderPort } from '../../domain/ports/out/toll-provider.port';
import { CalculateTollCommand } from '../../domain/ports/in/calculate-toll.use-case';
import { Route } from '../../domain/model/route.model';
import { TollguruClient } from './tollguru/tollguru.client';
import { TollguruRequestBuilder } from './tollguru/tollguru-request.builder';
import { TollguruResponseMapper } from './tollguru/tollguru-response.mapper';
import { VehicleRepositoryPort } from '../../../vehicles/domain/ports/out/vehicle-repository.port';
import { TollProviderException } from '../../domain/exceptions/toll-provider.exception';

@Injectable()
export class TollguruProviderAdapter extends TollProviderPort {
  constructor(
    private readonly client: TollguruClient,
    private readonly builder: TollguruRequestBuilder,
    private readonly mapper: TollguruResponseMapper,
    @Inject(VehicleRepositoryPort)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {
    super();
  }

  async calculateRoute(command: CalculateTollCommand): Promise<Route[]> {
    const vehicle = await this.vehicleRepo.findById(command.vehicleId);
    if (!vehicle) {
      throw new TollProviderException(
        'TOLLGURU',
        new Error('Vehicle not found'),
      );
    }

    const request = this.builder.build(command, vehicle.vehicleType.code);
    const response = await this.client.post(request);
    return this.mapper.map(response);
  }
}
