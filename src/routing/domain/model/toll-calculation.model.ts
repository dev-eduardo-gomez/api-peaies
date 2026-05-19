import { Coordinate } from './coordinate.model';
import { Route } from './route.model';

export interface TollCalculation {
  id: string;
  userId: string;
  vehicleId: string;
  origin: Coordinate;
  destination: Coordinate;
  waypoints: Coordinate[];
  departureTime?: Date;
  routes: Route[];
  provider: 'TOLLGURU' | 'MOCK' | 'LOCAL_DB';
  requestHash: string;
  calculatedAt: Date;
  /** Populated only by findByUser (history listing) — not persisted as a column */
  routeCount?: number;
  cheapestRouteCost?: number;
}
