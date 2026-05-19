import { Injectable } from '@nestjs/common';
import { roundMxn } from '../../../shared/util/money.util';
import { Money } from '../model/money.model';

export interface FuelCostParams {
  distanceMeters: number;
  cityRatio: number;
  cityKmpl: number;
  hwyKmpl: number;
  fuelPricePerLiter: number;
  currency: 'MXN' | 'USD';
}

@Injectable()
export class FuelCostCalculator {
  calculate(params: FuelCostParams): Money {
    const {
      distanceMeters,
      cityRatio,
      cityKmpl,
      hwyKmpl,
      fuelPricePerLiter,
      currency,
    } = params;

    if (distanceMeters <= 0) return { amount: 0, currency };
    if (cityKmpl <= 0 && hwyKmpl <= 0) return { amount: 0, currency };

    const distanceKm = distanceMeters / 1000;
    const cityKm = distanceKm * Math.min(Math.max(cityRatio, 0), 1);
    const hwyKm = distanceKm - cityKm;

    const cityFuelL = cityKmpl > 0 ? cityKm / cityKmpl : 0;
    const hwyFuelL = hwyKmpl > 0 ? hwyKm / hwyKmpl : 0;

    return {
      amount: roundMxn((cityFuelL + hwyFuelL) * fuelPricePerLiter),
      currency,
    };
  }
}
