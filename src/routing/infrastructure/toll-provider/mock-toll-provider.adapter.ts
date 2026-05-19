import { Injectable } from '@nestjs/common';
import { TollProviderPort } from '../../domain/ports/out/toll-provider.port';
import { CalculateTollCommand } from '../../domain/ports/in/calculate-toll.use-case';
import { Route } from '../../domain/model/route.model';
import { TollBooth } from '../../domain/model/toll-booth.model';
import { PaymentMethod } from '../../domain/model/payment-method.enum';

const mockBooth = (
  seq: number,
  name: string,
  cash: number,
  tag: number,
): TollBooth => ({
  sequence: seq,
  boothName: name,
  cashCost: { amount: cash, currency: 'MXN' },
  tagCost: { amount: tag, currency: 'MXN' },
  costApplied: { amount: cash, currency: 'MXN' },
  paymentMethod: PaymentMethod.CASH,
  eventType: 'PAY',
});

const ROUTE_1_TOLLS: TollBooth[] = [
  mockBooth(1, 'Caseta Campeche Norte', 45, 36),
  mockBooth(2, 'Caseta Villahermosa', 60, 48),
  mockBooth(3, 'Caseta Cardel', 55, 44),
  mockBooth(4, 'Caseta Tampico Norte', 70, 56),
  mockBooth(5, 'Caseta San Fernando', 50, 40),
  mockBooth(6, 'Caseta Monterrey Sur', 80, 64),
];

const ROUTE_2_TOLLS: TollBooth[] = [
  mockBooth(1, 'Caseta Coatzacoalcos', 40, 32),
  mockBooth(2, 'Caseta Acayucan', 45, 36),
  mockBooth(3, 'Caseta Veracruz', 55, 44),
  mockBooth(4, 'Caseta Monterrey Oriente', 75, 60),
];

@Injectable()
export class MockTollProviderAdapter extends TollProviderPort {
  async calculateRoute(_command: CalculateTollCommand): Promise<Route[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const now = new Date();

    return [
      {
        routeIndex: 0,
        labels: [],
        hasTolls: true,
        distanceMeters: 921_400,
        durationSeconds: 32_520,
        tollCount: ROUTE_1_TOLLS.length,
        costs: {
          tagCost: { amount: 288, currency: 'MXN' },
          cashCost: { amount: 360, currency: 'MXN' },
          fuelCost: { amount: 0, currency: 'MXN' },
          grandTotal: { amount: 360, currency: 'MXN' },
        },
        tolls: ROUTE_1_TOLLS,
        directions: [],
        arrival: {
          estimatedArrival: new Date(now.getTime() + 32_520 * 1000),
          durationSeconds: 32_520,
          trafficDelaySeconds: 0,
        },
        polyline: '',
        googleMapsUrl: undefined,
      },
      {
        routeIndex: 1,
        labels: [],
        hasTolls: true,
        distanceMeters: 978_200,
        durationSeconds: 35_880,
        tollCount: ROUTE_2_TOLLS.length,
        costs: {
          tagCost: { amount: 172, currency: 'MXN' },
          cashCost: { amount: 215, currency: 'MXN' },
          fuelCost: { amount: 0, currency: 'MXN' },
          grandTotal: { amount: 215, currency: 'MXN' },
        },
        tolls: ROUTE_2_TOLLS,
        directions: [],
        arrival: {
          estimatedArrival: new Date(now.getTime() + 35_880 * 1000),
          durationSeconds: 35_880,
          trafficDelaySeconds: 0,
        },
        polyline: '',
        googleMapsUrl: undefined,
      },
    ];
  }
}
