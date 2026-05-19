import { Injectable } from '@nestjs/common';
import { PoiServicePort } from '../../domain/ports/in/poi-service.port';
import { PoiType } from '../../domain/model/poi-type.enum';
import { Poi } from '../../domain/model/poi.model';
import { PoiRepositoryPort } from '../../domain/ports/out/poi-repository.port';

@Injectable()
export class PoiApplicationService extends PoiServicePort {
  constructor(private readonly poiRepositoryPort: PoiRepositoryPort) {
    super();
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: PoiType,
  ): Promise<Poi[]> {
    return await this.poiRepositoryPort.findNearby(lat, lng, radiusKm, type);
  }

  async findAlongRoute(
    polylines: string[],
    corridorMeters: number = 500,
    type?: PoiType,
  ): Promise<Poi[]> {
    return this.poiRepositoryPort.findAlongRoute(polylines, corridorMeters, type);
  }
}
