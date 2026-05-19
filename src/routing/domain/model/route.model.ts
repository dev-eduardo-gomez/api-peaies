import { CostBreakdown } from './cost-breakdown.model';
import { DirectionStep } from './direction-step.model';
import { TollBooth } from './toll-booth.model';
import { ArrivalInfo } from './arrival-info.model';
import { RouteLabel } from './route-label.enum';

export interface Route {
  routeIndex: number;
  labels: RouteLabel[];
  hasTolls: boolean;
  distanceMeters: number;
  durationSeconds: number;
  tollCount: number;
  costs: CostBreakdown;
  tolls: TollBooth[];
  directions: DirectionStep[];
  arrival: ArrivalInfo;
  polyline: string;
  googleMapsUrl?: string;
}
