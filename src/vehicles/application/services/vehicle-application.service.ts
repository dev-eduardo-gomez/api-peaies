import { Injectable, Logger } from '@nestjs/common';
import { VehicleServicePort } from '../../domain/ports/in/vehicle-service.port';
import {
  CreateVehicleCommand,
  UpdateVehicleCommand,
  VehicleRepositoryPort,
} from '../../domain/ports/out/vehicle-repository.port';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { CreateVehicleRequestDto } from '../dto/create-vehicle-request.dto';
import { UpdateVehicleRequestDto } from '../dto/update-vehicle-request.dto';
import { DuplicatePlateException } from '../../domain/exceptions/duplicate-plate.exception';
import { VehicleNotFoundException } from '../../domain/exceptions/vehicle-not-found.exception';
import { Vehicle } from '../../domain/model/vehicle.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VehicleApplicationService extends VehicleServicePort {
  private readonly logger = new Logger(VehicleApplicationService.name);

  constructor(private readonly vehicleRepositoryPort: VehicleRepositoryPort) {
    super();
  }

  async create(
    userId: string,
    dto: CreateVehicleRequestDto,
  ): Promise<VehicleResponseDto> {
    if (
      dto.plate &&
      (await this.vehicleRepositoryPort.existsByUserIdAndPlate(
        userId,
        dto.plate,
      ))
    ) {
      throw new DuplicatePlateException(dto.plate);
    }

    const command: CreateVehicleCommand = {
      id: uuidv4(),
      userId,
      alias: dto.alias,
      plate: dto.plate ?? null,
      vehicleTypeCode: dto.vehicleTypeCode,
      fuelTypeCode: dto.fuelTypeCode,
      cargoTypeCode: dto.cargoTypeCode ?? null,
      engine: {
        displacementCc: dto.engine?.displacementCc ?? null,
        cylinders: dto.engine?.cylinders ?? null,
        horsepower: dto.engine?.horsepower ?? null,
      },
      year: dto.year ?? null,
      brand: dto.brand ?? null,
      model: dto.model ?? null,
      dimensions: {
        weightKg: dto.dimensions.weightKg,
        heightM: dto.dimensions.heightM ?? null,
        lengthM: dto.dimensions.lengthM ?? null,
        widthM: dto.dimensions.widthM ?? null,
        axles: dto.dimensions.axles,
      },
      cargoWeightKg: dto.cargoWeightKg ?? null,
      maxCargoCapacityKg: dto.maxCargoCapacityKg ?? null,
      efficiency: {
        cityKmpl: dto.efficiency?.cityKmpl ?? null,
        hwyKmpl: dto.efficiency?.hwyKmpl ?? null,
        tankCapacityL: dto.efficiency?.tankCapacityL ?? null,
      },
      emissionClass: dto.emissionClass ?? null,
      tags: dto.tags ?? [],
    };

    const vehicle = await this.vehicleRepositoryPort.save(command);

    this.logger.log(`Vehicle created: ${vehicle.id}`);

    return this.toResponseDto(vehicle);
  }

  async findById(id: string): Promise<VehicleResponseDto | null> {
    const vehicle = await this.vehicleRepositoryPort.findById(id);
    if (!vehicle) return null;
    return this.toResponseDto(vehicle);
  }

  async findAllByUserId(userId: string): Promise<VehicleResponseDto[]> {
    const vehicles = await this.vehicleRepositoryPort.findAllByUserId(userId);
    return vehicles.map((v) => this.toResponseDto(v));
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateVehicleRequestDto,
  ): Promise<VehicleResponseDto> {
    const existing = await this.vehicleRepositoryPort.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new VehicleNotFoundException(id);
    }

    if (
      dto.plate &&
      dto.plate !== existing.plate &&
      (await this.vehicleRepositoryPort.existsByUserIdAndPlate(
        userId,
        dto.plate,
      ))
    ) {
      throw new DuplicatePlateException(dto.plate);
    }

    const command: UpdateVehicleCommand = {
      alias: dto.alias,
      plate: dto.plate,
      vehicleTypeCode: dto.vehicleTypeCode,
      fuelTypeCode: dto.fuelTypeCode,
      cargoTypeCode: dto.cargoTypeCode,
      engine: dto.engine
        ? {
            displacementCc: dto.engine.displacementCc,
            cylinders: dto.engine.cylinders,
            horsepower: dto.engine.horsepower,
          }
        : undefined,
      year: dto.year,
      brand: dto.brand,
      model: dto.model,
      dimensions: dto.dimensions
        ? {
            weightKg: dto.dimensions.weightKg,
            heightM: dto.dimensions.heightM,
            lengthM: dto.dimensions.lengthM,
            widthM: dto.dimensions.widthM,
            axles: dto.dimensions.axles,
          }
        : undefined,
      cargoWeightKg: dto.cargoWeightKg,
      maxCargoCapacityKg: dto.maxCargoCapacityKg,
      efficiency: dto.efficiency
        ? {
            cityKmpl: dto.efficiency.cityKmpl,
            hwyKmpl: dto.efficiency.hwyKmpl,
            tankCapacityL: dto.efficiency.tankCapacityL,
          }
        : undefined,
      emissionClass: dto.emissionClass,
      tags: dto.tags,
    };

    const vehicle = await this.vehicleRepositoryPort.update(
      id,
      userId,
      command,
    );

    return this.toResponseDto(vehicle);
  }

  async delete(id: string): Promise<void> {
    await this.vehicleRepositoryPort.delete(id);
  }

  private toResponseDto(vehicle: Vehicle): VehicleResponseDto {
    return {
      id: vehicle.id,
      alias: vehicle.alias,
      plate: vehicle.plate,
      vehicleType: vehicle.vehicleType,
      fuelType: vehicle.fuelType,
      cargoType: vehicle.cargoType,
      engine: vehicle.engine,
      year: vehicle.year,
      brand: vehicle.brand,
      model: vehicle.model,
      dimensions: vehicle.dimensions,
      cargoWeightKg: vehicle.cargoWeightKg,
      maxCargoCapacityKg: vehicle.maxCargoCapacityKg,
      efficiency: vehicle.efficiency,
      emissionClass: vehicle.emissionClass,
      tags: vehicle.tags,
      createdAt: vehicle.createdAt,
    };
  }
}
