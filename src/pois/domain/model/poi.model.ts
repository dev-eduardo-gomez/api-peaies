import { PoiType } from './poi-type.enum';

export interface Poi {
  id: string;
  name: string;
  poiType: PoiType;
  brand: string | null;
  lat: number;
  lng: number;
  address: string | null;
  metadata: Record<string, unknown> | null;
  source: 'MANUAL' | 'OSM' | 'GOOGLE';
  verified: boolean;
  distanceKm?: number;
  createdAt: Date;
  updatedAt: Date;
}
