import { Injectable } from '@nestjs/common';
import { TollguruResponseDto } from './dto/tollguru-response.dto';
import { TollguruRouteDto } from './dto/tollguru-route.dto';
import { TollguruTollDto } from './dto/tollguru-toll.dto';
import { Route } from '../../../domain/model/route.model';
import { TollBooth } from '../../../domain/model/toll-booth.model';
import { Money } from '../../../domain/model/money.model';
import { TollEventType } from '../../../domain/model/toll-event.type';
import { PaymentMethod } from '../../../domain/model/payment-method.enum';

@Injectable()
export class TollguruResponseMapper {
  map(response: TollguruResponseDto): Route[] {
    return response.routes.map((raw, index) => this.mapRoute(raw, index));
  }

  private mapRoute(raw: TollguruRouteDto, index: number): Route {
    const tolls: TollBooth[] = (raw.tolls ?? []).map((t, i) =>
      this.mapToll(t, i),
    );
    const now = new Date();

    return {
      routeIndex: index,
      labels: [],
      hasTolls: raw.hasTolls,
      distanceMeters: raw.distance.value,
      durationSeconds: raw.duration.value,
      tollCount: tolls.length,
      costs: {
        tagCost: { amount: 0, currency: 'MXN' },
        cashCost: { amount: 0, currency: 'MXN' },
        fuelCost: { amount: 0, currency: 'MXN' },
        grandTotal: { amount: 0, currency: 'MXN' },
      },
      tolls,
      directions: [],
      arrival: {
        estimatedArrival: new Date(now.getTime() + raw.duration.value * 1000),
        durationSeconds: raw.duration.value,
        trafficDelaySeconds: 0,
      },
      polyline: raw.polyline ?? '',
      googleMapsUrl: raw.url,
    };
  }

  private mapToll(t: TollguruTollDto, index: number): TollBooth {
    const cashCost: Money = { amount: t.cashCost ?? 0, currency: 'MXN' };
    const tagCost: Money = {
      amount: t.tagCost ?? t.cashCost ?? 0,
      currency: 'MXN',
    };

    return {
      sequence: index + 1,
      boothName: t.name,
      lat: t.lat,
      lng: t.lng,
      cashCost,
      tagCost,
      costApplied: cashCost,
      paymentMethod: PaymentMethod.CASH,
      eventType: this.resolveEventType(t.type),
    };
  }

  private resolveEventType(type?: string): TollEventType {
    if (type === 'ticketSystem') return 'ENTER';
    return 'PAY';
  }
}
