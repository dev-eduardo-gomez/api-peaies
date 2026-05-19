import { Coordinate } from '../../model/coordinate.model';
import { RouteDiff } from '../../model/route-diff.model';

export interface CompareRoutesCommand {
  userId: string;
  vehicleId: string;
  origin: Coordinate;
  destination: Coordinate;
  waypoints?: Coordinate[];
  departureTime?: Date;
}

export abstract class CompareRoutesUseCase {
  abstract execute(command: CompareRoutesCommand): Promise<RouteDiff>;
}
