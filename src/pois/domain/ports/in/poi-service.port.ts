import { PoiType } from '../../model/poi-type.enum';
import { Poi } from '../../model/poi.model';

export abstract class PoiServicePort {
  abstract findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: PoiType,
  ): Promise<Poi[]>;
  abstract findAlongRoute(
    polylines: string[],
    corridorMeters: number,
    type?: PoiType,
  ): Promise<Poi[]>;
}
