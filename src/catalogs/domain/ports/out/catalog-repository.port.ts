import {
  CargoType,
  FuelType,
  TagSystem,
  TollOperatorType,
  VehicleType,
} from '../../model/catalog-types.model';

export abstract class CatalogRepositoryPort {
  abstract findCargoTypeByOrderCode(): Promise<CargoType[]>;
  abstract findFuelTypeByOrderCode(): Promise<FuelType[]>;
  abstract findTagSystemByOrderCode(): Promise<TagSystem[]>;
  abstract findTollOperatorByOrderCode(): Promise<TollOperatorType[]>;
  abstract findVehicleTypeByOrderCode(): Promise<VehicleType[]>;
}
