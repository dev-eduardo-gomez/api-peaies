import { Injectable } from '@nestjs/common';
import { PoiRepositoryPort } from '../../domain/ports/out/poi-repository.port';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PoiType } from '../../domain/model/poi-type.enum';
import { Poi } from '../../domain/model/poi.model';
import { POI_QUERIES } from '../persistence/poi.queries';

@Injectable()
export class PoiRepositoryAdapter extends PoiRepositoryPort {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    super();
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: PoiType,
  ): Promise<Poi[]> {
    const rows: Poi[] = await this.entityManager.query(
      POI_QUERIES.FIND_POIS_NEARBY,
      [lat, lng, radiusKm, type ?? null],
    );
    return rows.map((row) => this.toDomain(row));
  }

  async findAlongRoute(
    polylines: string[],
    corridorMeters: number,
    type?: PoiType,
  ): Promise<Poi[]> {
    const wkt = this.toLineStringWkt(polylines);
    const rows: Poi[] = await this.entityManager.query(
      POI_QUERIES.FIND_POIS_ALONG_ROUTE,
      [wkt, corridorMeters, type ?? null],
    );
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: any): Poi {
    return {
      id: row.id as string,
      name: row.name as string,
      poiType: row.type as PoiType,
      brand: (row.brand as string) ?? null,
      lat: parseFloat(row.lat as string),
      lng: parseFloat(row.lng as string),
      address: (row.address as string) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? null,
      source: row.source as 'MANUAL' | 'OSM' | 'GOOGLE',
      verified: row.verified as boolean,
      distanceKm:
        row.distance_km != null
          ? parseFloat(row.distance_km as string)
          : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // Converts an array of WKT LINESTRING segments into a single MULTILINESTRING
  // expected by ST_GeomFromText in FIND_POIS_ALONG_ROUTE.
  private toLineStringWkt(polylines: string[]): string {
    if (polylines.length === 1) return polylines[0];
    const inner = polylines
      .map((p) => p.replace(/^LINESTRING\s*/i, '').trim())
      .join(', ');
    return `MULTILINESTRING(${inner})`;
  }
}
