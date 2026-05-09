import { TollBoothRate } from './toll-booth-rate.model';
import { TollOperator } from './toll-operator.model';

export interface AcceptedTag {
  code: string;
  isPrimary: boolean;
}

export interface TollBoothSummary {
  id: string;
  externalId: number | null;
  name: string;
  road: string | null;
  state: string | null;
  country: string;
  systemType: string;
  heightRestrictionM: number | null;
  lat: number;
  lng: number;
  operator: TollOperator | null;
}

export interface TollBoothCatalog {
  id: string;
  externalId: number | null;
  name: string;
  road: string | null;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  systemType: string;
  heightRestrictionM: number | null;
  discountCarType: string | null;
  discountCarDetails: string | null;
  operator: TollOperator | null;
  rates: TollBoothRate[];
  tags: AcceptedTag[];
  createdAt: Date;
  updatedAt: Date;
}
