import { Injectable } from '@nestjs/common';
import { BoothRepositoryPort } from '../../domain/ports/out/booth-repository.port';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { TollBoothCatalog } from '../../domain/model/toll-booth-catalog.model';
import { BOOTH_QUERIES } from '../persistence/booth.queries';
import { TollOperator } from '../../domain/model/toll-operator.model';
import { TollBoothRate } from '../../domain/model/toll-booth-rate.model';

@Injectable()
export class BoothRepositoryAdapter extends BoothRepositoryPort {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    super();
  }

  async findAll(
    limit: number,
    offset: number,
  ): Promise<{ data: TollBoothCatalog[]; total: number }> {
    const rows: TollBoothCatalog[] = await this.entityManager.query(
      BOOTH_QUERIES.FIND_ALL,
      [limit, offset],
    );

    return rows.length > 0
      ? { data: rows.map((i) => this.toDomain(i)), total: rows.length }
      : { data: [], total: 0 };
  }

  async countAll(): Promise<number> {
    const count: number = await this.entityManager.query(
      BOOTH_QUERIES.COUNT_ALL,
    );
    return count > 0 ? count : 0;
  }

  async findById(id: string): Promise<TollBoothCatalog | null> {
    const rows: TollBoothCatalog[] = await this.entityManager.query(
      BOOTH_QUERIES.FIND_BY_ID,
      [id],
    );
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<TollBoothCatalog[]> {
    const rows: TollBoothCatalog[] = await this.entityManager.query(
      BOOTH_QUERIES.FIND_NEARBY,
      [lat, lng, radiusKm],
    );

    return rows.length > 0 ? rows.map((i) => this.toDomain(i)) : [];
  }

  async findBestRate(
    boothId: string,
    vehicleTypeCode: string,
  ): Promise<TollBoothRate | null> {
    const rows: TollBoothRate[] = await this.entityManager.query(
      BOOTH_QUERIES.FIND_BEST_RATE,
      [boothId, vehicleTypeCode],
    );

    return rows.length > 0 ? rows[0] : null;
  }

  private toDomain(row: Record<string, any>): TollBoothCatalog {
    const rawRates = Array.isArray(row.rates)
      ? row.rates
      : (JSON.parse((row.rates as string) ?? '[]') as Record<string, any>[]);

    const rates: TollBoothRate[] = rawRates.map((r) => ({
      vehicleTypeCode: r.vehicleTypeCode as string,
      cash: r.cash != null ? Number(r.cash) : null,
      tagPrimary: r.tagPrimary != null ? Number(r.tagPrimary) : null,
      tagSecondary: r.tagSecondary != null ? Number(r.tagSecondary) : null,
      licensePlateCost:
        r.licensePlateCost != null ? Number(r.licensePlateCost) : null,
      prepaidCardCost:
        r.prepaidCardCost != null ? Number(r.prepaidCardCost) : null,
      currency: r.currency as string,
      validFrom: new Date(r.validFrom as string),
      source: r.source as TollBoothRate['source'],
    }));

    const rawTags = Array.isArray(row.tags)
      ? row.tags
      : (JSON.parse((row.tags as string) ?? '[]') as Record<string, any>[]);

    const tags = rawTags.map((t) => ({
      code: t.code as string,
      isPrimary: Boolean(t.isPrimary),
    }));

    const operator: TollOperator | null = row.operator_code
      ? {
          code: row.operator_code as string,
          name: row.operator_name as string,
          country: row.country as string,
          website: null,
        }
      : null;

    return {
      id: row.id as string,
      externalId: row.external_id != null ? Number(row.external_id) : null,
      name: row.name as string,
      road: (row.road as string) ?? null,
      state: (row.state as string) ?? null,
      country: row.country as string,
      lat: Number(row.lat),
      lng: Number(row.lng),
      systemType: row.system_type as string,
      heightRestrictionM:
        row.height_restriction_m != null
          ? Number(row.height_restriction_m)
          : null,
      discountCarType: (row.discount_car_type as string) ?? null,
      discountCarDetails: (row.discount_car_details as string) ?? null,
      operator,
      rates,
      tags,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
