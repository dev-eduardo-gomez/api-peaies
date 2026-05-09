import { TollBoothCatalog } from '../../model/toll-booth-catalog.model';

export abstract class BoothCatalogServicePort {
  abstract findAll(
    page: number,
    limit: number,
  ): Promise<{ data: TollBoothCatalog[]; total: number }>;
  abstract findById(id: string): Promise<TollBoothCatalog>;
  abstract findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<TollBoothCatalog[]>;
}
