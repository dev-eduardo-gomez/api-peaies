import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { TollCalculationRepositoryPort } from '../../domain/ports/out/toll-calculation-repository.port';
import { TollCalculation } from '../../domain/model/toll-calculation.model';
import { Route } from '../../domain/model/route.model';
import { TollBooth } from '../../domain/model/toll-booth.model';
import { DirectionStep } from '../../domain/model/direction-step.model';
import { Coordinate } from '../../domain/model/coordinate.model';
import { PaymentMethod } from '../../domain/model/payment-method.enum';
import { TollEventType } from '../../domain/model/toll-event.type';
import { ROUTING_QUERIES } from '../persistence/routing.queries';

@Injectable()
export class TollCalculationRepositoryAdapter extends TollCalculationRepositoryPort {
  private readonly logger = new Logger(TollCalculationRepositoryAdapter.name);

  constructor(@InjectEntityManager() private readonly em: EntityManager) {
    super();
  }

  async save(calculation: TollCalculation): Promise<TollCalculation> {
    await this.em.transaction(async (tx) => {
      await tx.query(ROUTING_QUERIES.INSERT_CALCULATION, [
        calculation.id,
        calculation.userId,
        calculation.vehicleId,
        calculation.requestHash,
        calculation.origin.address ?? null,
        calculation.origin.lng,
        calculation.origin.lat,
        calculation.destination.address ?? null,
        calculation.destination.lng,
        calculation.destination.lat,
        calculation.waypoints.length
          ? JSON.stringify(calculation.waypoints)
          : null,
        calculation.departureTime ?? null,
        calculation.provider,
        JSON.stringify({ routes: calculation.routes }),
      ]);

      for (const route of calculation.routes) {
        const routeId = uuid();

        await tx.query(ROUTING_QUERIES.INSERT_ROUTE, [
          routeId,
          calculation.id,
          route.routeIndex,
          route.labels.join(','),
          route.hasTolls,
          route.distanceMeters,
          route.durationSeconds,
          route.tollCount,
          route.costs.fuelCost.amount,
          route.costs.tagCost.amount,
          route.costs.cashCost.amount,
          route.costs.grandTotal.amount,
          route.polyline,
          route.googleMapsUrl ?? null,
        ]);

        const boothOps = route.tolls.map((toll) =>
          tx.query(ROUTING_QUERIES.INSERT_ROUTE_BOOTH, [
            routeId,
            toll.sequence,
            toll.boothId ?? null,
            null,
            toll.eventType,
            toll.boothName,
            toll.cashCost.amount,
            toll.tagCost.amount,
            toll.costApplied.amount,
            toll.paymentMethod,
            toll.arrivalTime ?? null,
          ]),
        );

        const stepOps = route.directions.map((step) =>
          tx.query(ROUTING_QUERIES.INSERT_DIRECTION_STEP, [
            routeId,
            step.sequence,
            step.coordinate.lat,
            step.coordinate.lng,
            step.instruction,
            step.distanceMeters,
            step.durationSeconds,
          ]),
        );

        await Promise.all([...boothOps, ...stepOps]);
      }
    });

    return calculation;
  }

  async findById(id: string, userId: string): Promise<TollCalculation | null> {
    const rows = await this.em.query(ROUTING_QUERIES.FIND_CALCULATION_BY_ID, [
      id,
      userId,
    ]);
    if (!rows.length) return null;

    const routeRows = await this.em.query(
      ROUTING_QUERIES.FIND_ROUTES_BY_CALCULATION,
      [id],
    );

    const routes = await Promise.all(
      routeRows.map(async (r: Record<string, unknown>) => {
        const [boothRows, dirRows] = await Promise.all([
          this.em.query(ROUTING_QUERIES.FIND_BOOTHS_BY_ROUTE, [r.id]),
          this.em.query(ROUTING_QUERIES.FIND_DIRECTIONS_BY_ROUTE, [r.id]),
        ]);
        return this.mapRoute(r, boothRows, dirRows);
      }),
    );

    return this.mapCalculation(rows[0], routes);
  }

  async findByHash(
    requestHash: string,
    userId: string,
  ): Promise<TollCalculation | null> {
    const rows = await this.em.query(ROUTING_QUERIES.FIND_CALCULATION_BY_HASH, [
      requestHash,
      userId,
    ]);
    if (!rows.length) return null;
    return this.findById(rows[0].id as string, userId);
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TollCalculation[]; total: number }> {
    const offset = (page - 1) * limit;

    const [rows, countRows] = await Promise.all([
      this.em.query(ROUTING_QUERIES.FIND_CALCULATIONS_BY_USER, [
        userId,
        limit,
        offset,
      ]),
      this.em.query(ROUTING_QUERIES.COUNT_BY_USER, [userId]),
    ]);

    const data: TollCalculation[] = (rows as Record<string, unknown>[]).map(
      (row) => ({
        id: row.id as string,
        userId,
        vehicleId: '',
        origin: {
          lat: Number(row.origin_lat),
          lng: Number(row.origin_lng),
          address: (row.origin_address as string) ?? undefined,
        },
        destination: {
          lat: Number(row.destination_lat),
          lng: Number(row.destination_lng),
          address: (row.destination_address as string) ?? undefined,
        },
        waypoints: [],
        routes: [],
        provider: row.provider as 'TOLLGURU' | 'MOCK',
        requestHash: '',
        calculatedAt: new Date(row.created_at as string),
        routeCount: Number(row.route_count),
        cheapestRouteCost: Number(row.cheapest_route_cost) || 0,
      }),
    );

    return { data, total: Number(countRows[0].total) };
  }

  private mapCalculation(
    row: Record<string, unknown>,
    routes: Route[],
  ): TollCalculation {
    const waypoints: Coordinate[] = row.waypoints_json
      ? (JSON.parse(row.waypoints_json as string) as Coordinate[])
      : [];

    return {
      id: row.id as string,
      userId: row.user_id as string,
      vehicleId: row.vehicle_id as string,
      requestHash: row.request_hash as string,
      origin: {
        lat: Number(row.origin_lat),
        lng: Number(row.origin_lng),
        address: (row.origin_address as string) ?? undefined,
      },
      destination: {
        lat: Number(row.destination_lat),
        lng: Number(row.destination_lng),
        address: (row.destination_address as string) ?? undefined,
      },
      waypoints,
      departureTime: row.departure_time
        ? new Date(row.departure_time as string)
        : undefined,
      routes,
      provider: row.provider as 'TOLLGURU' | 'MOCK',
      calculatedAt: new Date(row.created_at as string),
    };
  }

  private mapRoute(
    row: Record<string, unknown>,
    boothRows: Record<string, unknown>[],
    dirRows: Record<string, unknown>[],
  ): Route {
    const tolls: TollBooth[] = boothRows.map((b) => ({
      sequence: Number(b.sequence_order),
      boothId: (b.toll_booth_id as string) ?? undefined,
      boothName: b.booth_name as string,
      cashCost: { amount: Number(b.cash_cost), currency: 'MXN' },
      tagCost: { amount: Number(b.tag_pri_cost), currency: 'MXN' },
      costApplied: { amount: Number(b.cost_applied), currency: 'MXN' },
      paymentMethod:
        (b.payment_method_used as PaymentMethod) ?? PaymentMethod.CASH,
      eventType: (b.event_type as TollEventType) ?? 'PAY',
      arrivalTime: b.arrival_time
        ? new Date(b.arrival_time as string)
        : undefined,
    }));

    const directions: DirectionStep[] = dirRows.map((d) => ({
      sequence: Number(d.sequence_order),
      instruction: d.instruction as string,
      distanceMeters: Number(d.distance_meters),
      durationSeconds: Number(d.duration_seconds),
      coordinate: { lat: Number(d.lat), lng: Number(d.lng) },
    }));

    const labels = row.labels
      ? (row.labels as string).split(',').filter(Boolean)
      : [];

    return {
      routeIndex: Number(row.route_index),
      labels: labels as Route['labels'],
      hasTolls: Boolean(row.has_tolls),
      distanceMeters: Number(row.distance_meters),
      durationSeconds: Number(row.duration_seconds),
      tollCount: Number(row.toll_count),
      costs: {
        tagCost: { amount: Number(row.tag_cost), currency: 'MXN' },
        cashCost: { amount: Number(row.cash_cost), currency: 'MXN' },
        fuelCost: { amount: Number(row.fuel_cost), currency: 'MXN' },
        grandTotal: { amount: Number(row.grand_total), currency: 'MXN' },
      },
      tolls,
      directions,
      arrival: {
        estimatedArrival: new Date(),
        durationSeconds: Number(row.duration_seconds),
        trafficDelaySeconds: 0,
      },
      polyline: (row.polyline as string) ?? '',
      googleMapsUrl: (row.google_maps_url as string) ?? undefined,
    };
  }
}
