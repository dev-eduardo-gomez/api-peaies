import { Injectable } from '@nestjs/common';
import { PoiRepositoryPort } from '../../domain/ports/out/poi-repository.port';
import { PoiType } from '../../domain/model/poi-type.enum';
import { Poi } from '../../domain/model/poi.model';

@Injectable()
export class RouteEnrichmentApplicationService {
  constructor(private readonly poiRepositoryPort: PoiRepositoryPort) {}

  async findAlongRoute(
    polylines: string[],
    corridorMeters: number = 500,
    type?: PoiType,
  ): Promise<Poi[]> {
    return this.poiRepositoryPort.findAlongRoute(polylines, corridorMeters, type);
  }
}
