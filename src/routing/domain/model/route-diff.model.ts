import { Money } from './money.model';
import { Route } from './route.model';

export interface RouteDiff {
  fasterRoute: Route;
  cheaperRoute: Route;
  isSameRoute: boolean;
  timeDifferenceSeconds: number;
  costDifference: Money;
}
