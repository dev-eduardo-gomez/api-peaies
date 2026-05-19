export interface TollguruVehicleDto {
  type: string;
}

export interface TollguruRequestDto {
  vehicle: TollguruVehicleDto;
  departure: string;
  source: [number, number];
  destination: [number, number];
  waypoints: [number, number][];
  currency: 'MXN' | 'USD';
}
