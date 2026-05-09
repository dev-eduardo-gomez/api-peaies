import { Injectable } from '@nestjs/common';
import { CatalogServicePort } from '../../domain/ports/in/catalog-service.port';
import { CatalogRepositoryPort } from '../../domain/ports/out/catalog-repository.port';
import { CargoTypeResponseDto } from '../dto/cargo-type-response.dto';
import { FuelTypeResponseDto } from '../dto/fuel-type-response.dto';
import { TagSystemResponseDto } from '../dto/tag-system-response.dto';
import { TollOperatorResponseDto } from '../dto/toll-operator-response.dto';
import { VehicleTypeResponseDto } from '../dto/vehicle-type-response.dto';

@Injectable()
export class CatalogApplicationService extends CatalogServicePort {
  constructor(private readonly catalogRepositoryPort: CatalogRepositoryPort) {
    super();
  }

  async findCargoTypeByOrderCode(): Promise<CargoTypeResponseDto[]> {
    return await this.catalogRepositoryPort.findCargoTypeByOrderCode();
  }

  async findFuelTypeByOrderCode(): Promise<FuelTypeResponseDto[]> {
    return await this.catalogRepositoryPort.findFuelTypeByOrderCode();
  }

  async findTagSystemByOrderCode(): Promise<TagSystemResponseDto[]> {
    return await this.catalogRepositoryPort.findTagSystemByOrderCode();
  }

  async findTollOperatorByOrderCode(): Promise<TollOperatorResponseDto[]> {
    return await this.catalogRepositoryPort.findTollOperatorByOrderCode();
  }

  async findVehicleTypeByOrderCode(): Promise<VehicleTypeResponseDto[]> {
    return await this.catalogRepositoryPort.findVehicleTypeByOrderCode();
  }
}
