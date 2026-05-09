import { TollBoothCatalog } from '../../model/toll-booth-catalog.model';
import { TollBoothRate } from '../../model/toll-booth-rate.model';

export abstract class BoothRepositoryPort {
  abstract findAll(
    limit: number,
    offset: number,
  ): Promise<{ data: TollBoothCatalog[]; total: number }>;
  abstract countAll(): Promise<number>;
  abstract findById(id: string): Promise<TollBoothCatalog | null>;
  abstract findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<TollBoothCatalog[]>;
  abstract findBestRate(
    boothId: string,
    vehicleTypeCode: string,
  ): Promise<TollBoothRate | null>;
}
