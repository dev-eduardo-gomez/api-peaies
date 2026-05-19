import { Inject, Injectable } from '@nestjs/common';
import {
  CompareRoutesCommand,
  CompareRoutesUseCase,
} from '../../domain/ports/in/compare-routes.use-case';
import { CalculateTollUseCase } from '../../domain/ports/in/calculate-toll.use-case';
import { RouteDiff } from '../../domain/model/route-diff.model';
import { RouteLabel } from '../../domain/model/route-label.enum';
import { Money } from '../../domain/model/money.model';
import { roundMxn } from '../../../shared/util/money.util';

@Injectable()
export class RouteComparisonApplicationService extends CompareRoutesUseCase {
  constructor(
    @Inject(CalculateTollUseCase)
    private readonly calculateToll: CalculateTollUseCase,
  ) {
    super();
  }

  async execute(command: CompareRoutesCommand): Promise<RouteDiff> {
    const calculation = await this.calculateToll.execute(command);

    const fasterRoute =
      calculation.routes.find((r) => r.labels.includes(RouteLabel.FASTEST)) ??
      calculation.routes[0];

    const cheaperRoute =
      calculation.routes.find((r) => r.labels.includes(RouteLabel.CHEAPEST)) ??
      calculation.routes[0];

    const isSameRoute = fasterRoute.routeIndex === cheaperRoute.routeIndex;

    const timeDifferenceSeconds = Math.abs(
      fasterRoute.durationSeconds - cheaperRoute.durationSeconds,
    );

    const costDifference: Money = {
      amount: roundMxn(
        Math.abs(
          cheaperRoute.costs.grandTotal.amount -
            fasterRoute.costs.grandTotal.amount,
        ),
      ),
      currency: 'MXN',
    };

    return {
      fasterRoute,
      cheaperRoute,
      isSameRoute,
      timeDifferenceSeconds,
      costDifference,
    };
  }
}
