import { Dimensions } from '../../model/dimensions.model';
import { Engine } from '../../model/engine.model';
import { FuelEfficiency } from '../../model/fuel-efficiency.model';
import { Vehicle } from '../../model/vehicle.model';

export interface CreateVehicleCommand {
  id: string;
  userId: string;
  alias: string;
  plate: string | null;
  vehicleTypeCode: string;
  fuelTypeCode: string;
  cargoTypeCode: string | null;
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
}

export interface UpdateVehicleCommand {
  alias?: string;
  plate?: string | null;
  vehicleTypeCode?: string;
  fuelTypeCode?: string;
  cargoTypeCode?: string | null;
  engine?: Partial<Engine>;
  year?: number | null;
  brand?: string | null;
  model?: string | null;
  dimensions?: Partial<Dimensions>;
  cargoWeightKg?: number | null;
  maxCargoCapacityKg?: number | null;
  efficiency?: Partial<FuelEfficiency>;
  emissionClass?: string | null;
  tags?: string[];
}

export abstract class VehicleRepositoryPort {
  abstract save(vehicle: CreateVehicleCommand): Promise<Vehicle>;
  abstract update(
    id: string,
    userId: string,
    vehicle: UpdateVehicleCommand,
  ): Promise<Vehicle>;
  abstract findById(id: string): Promise<Vehicle | null>;
  abstract findAllByUserId(userId: string): Promise<Vehicle[]>;
  abstract existsByUserIdAndPlate(
    userId: string,
    plate: string,
  ): Promise<boolean>;
  abstract delete(id: string): Promise<void>;
}
