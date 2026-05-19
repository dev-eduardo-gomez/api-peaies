import { CalculateTollCommand } from '../in/calculate-toll.use-case';
import { Route } from '../../model/route.model';

export abstract class TollProviderPort {
  abstract calculateRoute(command: CalculateTollCommand): Promise<Route[]>;
}
