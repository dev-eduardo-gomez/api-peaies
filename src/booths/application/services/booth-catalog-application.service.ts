import { Injectable } from '@nestjs/common';
import { BoothCatalogServicePort } from '../../domain/ports/in/booth-catalog-service.port';
import { BoothRepositoryPort } from '../../domain/ports/out/booth-repository.port';
import { TollBoothCatalog } from '../../domain/model/toll-booth-catalog.model';
import { BoothNotFoundException } from '../../domain/exceptions/booth-not-found.exception';
import { TollBoothRate } from '../../domain/model/toll-booth-rate.model';
import { TollOperator } from '../../domain/model/toll-operator.model';

@Injectable()
export class BoothCatalogApplicationService extends BoothCatalogServicePort {
  constructor(private readonly boothRepositoryPort: BoothRepositoryPort) {
    super();
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: TollBoothCatalog[]; total: number }> {
    const offset = (page - 1) * limit;

    const [count, rows] = await Promise.all([
      this.boothRepositoryPort.countAll(),
      this.boothRepositoryPort.findAll(limit, offset),
    ]);

    const total = Math.ceil(count / limit);

    return {
      data: rows.data,
      total: total,
    };
  }

  async findById(id: string): Promise<TollBoothCatalog> {
    const rows = await this.boothRepositoryPort.findById(id);
    if (!rows) throw new BoothNotFoundException(id);

    return this.toResponse(rows);
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<TollBoothCatalog[]> {
    const rows = await this.boothRepositoryPort.findNearby(lat, lng, radiusKm);
    return rows.map((i) => this.toResponse(i));
  }

  private toResponse(row: Record<string, any>): TollBoothCatalog {
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
