import { TollguruTollDto } from './tollguru-toll.dto';

export interface TollguruDistanceDto {
  value: number;
  unit: string;
}

export interface TollguruDurationDto {
  value: number;
  unit: string;
}

export interface TollguruRouteCostsDto {
  tag?: number | null;
  cash?: number | null;
  currency: string;
}

export interface TollguruRouteDto {
  summary?: string;
  distance: TollguruDistanceDto;
  duration: TollguruDurationDto;
  hasTolls: boolean;
  costs?: TollguruRouteCostsDto;
  tolls?: TollguruTollDto[];
  polyline?: string;
  url?: string;
}
