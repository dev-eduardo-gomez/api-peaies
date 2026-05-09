export interface CargoType {
  id: string;
  code: string;
  name: string;
  requiresSpecialPermit: boolean;
}

export interface FuelType {
  id: string;
  code: string;
  name: string;
  unit: string;
  avgPriceMxn: number;
}

export interface TollOperatorType {
  id: string;
  code: string;
  name: string;
  country: string;
  website: string;
}

export interface TagSystem {
  id: string;
  code: string;
  name: string;
  country: string;
  operator: string;
  website: string;
}

export interface VehicleType {
  id: string;
  code: string;
  description: string;
  axles: string;
  category: string;
  maxWeightKg: number;
  maxHeightM: number;
}
