import { Injectable } from '@nestjs/common';
import { BoothCatalogServicePort } from '../../domain/ports/in/booth-catalog-service.port';
import { BoothRepositoryPort } from '../../domain/ports/out/booth-repository.port';
import {
  TollBoothCatalog,
  TollBoothSummary,
} from '../../domain/model/toll-booth-catalog.model';
import { BoothNotFoundException } from '../../domain/exceptions/booth-not-found.exception';

@Injectable()
export class BoothCatalogApplicationService extends BoothCatalogServicePort {
  constructor(private readonly boothRepositoryPort: BoothRepositoryPort) {
    super();
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{
    data: TollBoothSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pages = Math.max(1, page);
    const pageSize = Math.max(1, limit);

    const offset = (pages - 1) * pageSize;

    const [count, rows] = await Promise.all([
      this.boothRepositoryPort.countAll(),
      this.boothRepositoryPort.findAll(pageSize, offset),
    ]);

    return {
      data: rows.data,
      total: count,
      page: pages,
      limit: pageSize,
    };
  }

  async findById(id: string): Promise<TollBoothCatalog> {
    const rows = await this.boothRepositoryPort.findById(id);
    if (!rows) throw new BoothNotFoundException(id);

    return rows;
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<TollBoothCatalog[]> {
    const rows = await this.boothRepositoryPort.findNearby(lat, lng, radiusKm);
    return rows;
  }
}
