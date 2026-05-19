import { TollguruRouteDto } from './tollguru-route.dto';

export interface TollguruResponseDto {
  routes: TollguruRouteDto[];
  vehicleType?: string;
  currency?: string;
}
