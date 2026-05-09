export type RateSource = 'OFFICIAL' | 'MANUAL' | 'TOLLGURU';

export interface TollBoothRate {
  vehicleTypeCode: string;
  cash: number | null;
  tagPrimary: number | null;
  tagSecondary: number | null;
  licensePlateCost: number | null;
  prepaidCardCost: number | null;
  currency: string;
  validFrom: Date;
  source: RateSource;
}
