import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import {
  CalculateTollCommand,
  CalculateTollUseCase,
} from '../../domain/ports/in/calculate-toll.use-case';
import { TollCalculation } from '../../domain/model/toll-calculation.model';
import { TollCalculationRepositoryPort } from '../../domain/ports/out/toll-calculation-repository.port';
import { TollProviderPort } from '../../domain/ports/out/toll-provider.port';
import { VehicleRepositoryPort } from '../../../vehicles/domain/ports/out/vehicle-repository.port';
import { CatalogRepositoryPort } from '../../../catalogs/domain/ports/out/catalog-repository.port';
import { FuelCostCalculator } from '../../domain/services/fuel-cost-calculator';
import { RouteScorer } from '../../domain/services/route-scorer';
import { ArrivalTimeEstimator } from '../../domain/services/arrival-time-estimator';
import { TollCostAggregator } from '../../domain/services/toll-cost-aggregator';
import { PaymentMethod } from '../../domain/model/payment-method.enum';
import { Route } from '../../domain/model/route.model';
import { roundMxn } from '../../../shared/util/money.util';
import { hashObject } from '../../../shared/util/hash.util';

@Injectable()
export class TollCalculationApplicationService extends CalculateTollUseCase {
  private readonly fuelCalc = new FuelCostCalculator();
  private readonly scorer = new RouteScorer();
  private readonly estimator = new ArrivalTimeEstimator();
  private readonly aggregator = new TollCostAggregator();

  constructor(
    @Inject(TollCalculationRepositoryPort)
    private readonly calcRepo: TollCalculationRepositoryPort,
    @Inject(TollProviderPort)
    private readonly tollProvider: TollProviderPort,
    @Inject(VehicleRepositoryPort)
    private readonly vehicleRepo: VehicleRepositoryPort,
    @Inject(CatalogRepositoryPort)
    private readonly catalogRepo: CatalogRepositoryPort,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async execute(command: CalculateTollCommand): Promise<TollCalculation> {
    const requestHash = hashObject({
      userId: command.userId,
      vehicleId: command.vehicleId,
      origin: { lat: command.origin.lat, lng: command.origin.lng },
      destination: {
        lat: command.destination.lat,
        lng: command.destination.lng,
      },
      waypoints: (command.waypoints ?? []).map((w) => ({
        lat: w.lat,
        lng: w.lng,
      })),
    });

    const cached = await this.calcRepo.findByHash(requestHash, command.userId);
    if (cached) return cached;

    const vehicle = await this.vehicleRepo.findById(command.vehicleId);
    if (!vehicle || vehicle.userId !== command.userId) {
      throw new UnauthorizedException(
        'Vehicle not found or does not belong to this user',
      );
    }

    const fuelTypes = await this.catalogRepo.findFuelTypeByOrderCode();
    const fuelType = fuelTypes.find((ft) => ft.code === vehicle.fuelType.code);
    const fuelPricePerLiter = fuelType?.avgPriceMxn ?? 0;

    let routes = await this.tollProvider.calculateRoute(command);

    const preferredMethod =
      command.preferredPaymentMethod ?? PaymentMethod.CASH;

    routes = routes.map((route): Route => {
      const fuelCost = this.fuelCalc.calculate({
        distanceMeters: route.distanceMeters,
        cityRatio: 0.2,
        cityKmpl: vehicle.efficiency.cityKmpl ?? 0,
        hwyKmpl: vehicle.efficiency.hwyKmpl ?? 0,
        fuelPricePerLiter,
        currency: 'MXN',
      });

      const aggregated = this.aggregator.aggregate(route.tolls, 'MXN');
      const tollBase =
        preferredMethod === PaymentMethod.TAG
          ? aggregated.tagCost.amount
          : aggregated.cashCost.amount;

      return {
        ...route,
        costs: {
          tagCost: aggregated.tagCost,
          cashCost: aggregated.cashCost,
          fuelCost,
          grandTotal: {
            amount: roundMxn(tollBase + fuelCost.amount),
            currency: 'MXN',
          },
        },
      };
    });

    routes = this.scorer.score(routes);

    const departure = command.departureTime ?? new Date();
    routes = routes.map(
      (route): Route => ({
        ...route,
        arrival: this.estimator.estimate({
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          departureTime: departure,
        }),
      }),
    );

    const calculation: TollCalculation = {
      id: uuid(),
      userId: command.userId,
      vehicleId: command.vehicleId,
      origin: command.origin,
      destination: command.destination,
      waypoints: command.waypoints ?? [],
      departureTime: command.departureTime,
      routes,
      provider: (this.config.get<string>('TOLL_PROVIDER') ?? 'MOCK') as
        | 'TOLLGURU'
        | 'MOCK'
        | 'LOCAL_DB',
      requestHash,
      calculatedAt: new Date(),
    };

    return this.calcRepo.save(calculation);
  }
}
