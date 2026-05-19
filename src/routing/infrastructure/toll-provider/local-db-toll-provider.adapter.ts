import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { TollProviderPort } from '../../domain/ports/out/toll-provider.port';
import { CalculateTollCommand } from '../../domain/ports/in/calculate-toll.use-case';
import { Route } from '../../domain/model/route.model';
import { TollBooth } from '../../domain/model/toll-booth.model';
import { PaymentMethod } from '../../domain/model/payment-method.enum';
import { VehicleRepositoryPort } from '../../../vehicles/domain/ports/out/vehicle-repository.port';

const CORRIDOR_PADDING_DEG = 1.5;
const ROAD_FACTOR = 1.3;
const AVG_SPEED_MPS = 80_000 / 3600;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface BoothRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  cash_cost: number | null;
  tag_pri_cost: number | null;
  currency: string | null;
}

// $1 minLat  $2 maxLat  $3 minLng  $4 maxLng  $5 vehicleTypeCode  $6 originLat  $7 originLng
const CORRIDOR_QUERY = `
  SELECT
    b.id,
    b.name,
    ST_Y(b.location::geometry) AS lat,
    ST_X(b.location::geometry) AS lng,
    r.cash_cost,
    r.tag_pri_cost,
    r.currency
  FROM toll_booths b
  LEFT JOIN LATERAL (
    SELECT tbr.cash_cost, tbr.tag_pri_cost, tbr.currency
    FROM toll_booth_rates tbr
    JOIN vehicle_types vt ON vt.id = tbr.vehicle_type_id
    WHERE tbr.toll_booth_id = b.id
      AND vt.code = $5
      AND tbr.valid_from <= CURRENT_DATE
      AND (tbr.valid_to IS NULL OR tbr.valid_to >= CURRENT_DATE)
    ORDER BY
      CASE tbr.source
        WHEN 'OFFICIAL' THEN 1
        WHEN 'MANUAL'   THEN 2
        WHEN 'TOLLGURU' THEN 3
        ELSE 4
      END,
      tbr.valid_from DESC
    LIMIT 1
  ) r ON true
  WHERE ST_Y(b.location::geometry) BETWEEN $1 AND $2
    AND ST_X(b.location::geometry) BETWEEN $3 AND $4
  ORDER BY ST_Distance(b.location, ST_MakePoint($7, $6)::geography)
`;

@Injectable()
export class LocalDbTollProviderAdapter extends TollProviderPort {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @Inject(VehicleRepositoryPort)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {
    super();
  }

  async calculateRoute(command: CalculateTollCommand): Promise<Route[]> {
    const vehicle = await this.vehicleRepo.findById(command.vehicleId);
    const vehicleTypeCode = vehicle?.vehicleType.code ?? '2AxlesAuto';

    const { lat: oLat, lng: oLng } = command.origin;
    const { lat: dLat, lng: dLng } = command.destination;

    const minLat = Math.min(oLat, dLat) - CORRIDOR_PADDING_DEG;
    const maxLat = Math.max(oLat, dLat) + CORRIDOR_PADDING_DEG;
    const minLng = Math.min(oLng, dLng) - CORRIDOR_PADDING_DEG;
    const maxLng = Math.max(oLng, dLng) + CORRIDOR_PADDING_DEG;

    const rows: BoothRow[] = await this.em.query(CORRIDOR_QUERY, [
      minLat,
      maxLat,
      minLng,
      maxLng,
      vehicleTypeCode,
      oLat,
      oLng,
    ]);

    const preferredMethod =
      command.preferredPaymentMethod ?? PaymentMethod.CASH;

    const tolls: TollBooth[] = rows.map((row, idx) => {
      const cash = row.cash_cost ?? 0;
      const tag = row.tag_pri_cost ?? cash;
      const applied = preferredMethod === PaymentMethod.TAG ? tag : cash;
      const currency: 'MXN' | 'USD' = row.currency === 'USD' ? 'USD' : 'MXN';
      return {
        sequence: idx + 1,
        boothId: row.id,
        boothName: row.name,
        lat: row.lat,
        lng: row.lng,
        cashCost: { amount: cash, currency },
        tagCost: { amount: tag, currency },
        costApplied: { amount: applied, currency },
        paymentMethod: preferredMethod,
        eventType: 'PAY',
      };
    });

    const straightMeters = haversineMeters(oLat, oLng, dLat, dLng);
    const distanceMeters = Math.round(straightMeters * ROAD_FACTOR);
    const durationSeconds = Math.round(distanceMeters / AVG_SPEED_MPS);

    return [
      {
        routeIndex: 0,
        labels: [],
        hasTolls: tolls.length > 0,
        distanceMeters,
        durationSeconds,
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
          estimatedArrival: new Date(Date.now() + durationSeconds * 1000),
          durationSeconds,
          trafficDelaySeconds: 0,
        },
        polyline: '',
        googleMapsUrl: undefined,
      },
    ];
  }
}
