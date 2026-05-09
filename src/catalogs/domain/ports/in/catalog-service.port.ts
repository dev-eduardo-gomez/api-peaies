import { CargoTypeResponseDto } from '../../../application/dto/cargo-type-response.dto';
import { FuelTypeResponseDto } from '../../../application/dto/fuel-type-response.dto';
import { TagSystemResponseDto } from '../../../application/dto/tag-system-response.dto';
import { TollOperatorResponseDto } from '../../../application/dto/toll-operator-response.dto';
import { VehicleTypeResponseDto } from '../../../application/dto/vehicle-type-response.dto';

export abstract class CatalogServicePort {
  abstract findCargoTypeByOrderCode(): Promise<CargoTypeResponseDto[]>;
  abstract findFuelTypeByOrderCode(): Promise<FuelTypeResponseDto[]>;
  abstract findTagSystemByOrderCode(): Promise<TagSystemResponseDto[]>;
  abstract findTollOperatorByOrderCode(): Promise<TollOperatorResponseDto[]>;
  abstract findVehicleTypeByOrderCode(): Promise<VehicleTypeResponseDto[]>;
}
