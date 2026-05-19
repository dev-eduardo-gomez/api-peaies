import { Coordinate } from '../../model/coordinate.model';
import { PaymentMethod } from '../../model/payment-method.enum';
import { TollCalculation } from '../../model/toll-calculation.model';

export interface CalculateTollCommand {
  userId: string;
  vehicleId: string;
  origin: Coordinate;
  destination: Coordinate;
  waypoints?: Coordinate[];
  departureTime?: Date;
  preferredPaymentMethod?: PaymentMethod;
}

export abstract class CalculateTollUseCase {
  abstract execute(command: CalculateTollCommand): Promise<TollCalculation>;
}
