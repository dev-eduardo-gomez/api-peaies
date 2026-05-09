import { Dimensions } from './dimensions.model';
import { Engine } from './engine.model';
import { FuelEfficiency } from './fuel-efficiency.model';

export interface VehicleTypeInfo {
  code: string;
  description: string;
  axles: number;
  category: string;
}

export interface FuelTypeInfo {
  code: string;
  name: string;
  unit: string;
}

export interface CargoTypeInfo {
  code: string;
  name: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  alias: string;
  plate: string | null;
  vehicleType: VehicleTypeInfo;
  fuelType: FuelTypeInfo;
  cargoType: CargoTypeInfo | null;
  engine: Engine;
  year: number | null;
  brand: string | null;
  model: string | null;
  dimensions: Dimensions;
  cargoWeightKg: number | null;
  maxCargoCapacityKg: number | null;
  efficiency: FuelEfficiency;
  emissionClass: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
