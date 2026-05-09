import { Injectable, Logger } from '@nestjs/common';
import {
  CreateVehicleCommand,
  UpdateVehicleCommand,
  VehicleRepositoryPort,
} from '../../domain/ports/out/vehicle-repository.port';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Vehicle } from '../../domain/model/vehicle.model';
import { VEHICLE_QUERIES } from '../persistence/vehicle.queries';

@Injectable()
export class VehicleRepositoryAdapter extends VehicleRepositoryPort {
  private readonly logger = new Logger(VehicleRepositoryAdapter.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    super();
  }

  async findById(id: string): Promise<Vehicle | null> {
    const rows: Vehicle[] = await this.entityManager.query(
      VEHICLE_QUERIES.FIND_BY_ID,
      [id],
    );
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findAllByUserId(userId: string): Promise<Vehicle[]> {
    const rows: Vehicle[] = await this.entityManager.query(
      VEHICLE_QUERIES.FIND_BY_ALL_USER_ID,
      [userId],
    );

    return rows.length > 0 ? rows.map((i) => this.toDomain(i)) : [];
  }

  async existsByUserIdAndPlate(
    userId: string,
    plate: string,
  ): Promise<boolean> {
    const rows: { exists: boolean }[] = await this.entityManager.query(
      VEHICLE_QUERIES.EXISTS_VEHICLE_BY_ID_AND_PLATE,
      [userId, plate],
    );

    return rows[0].exists;
  }

  async save(vehicle: CreateVehicleCommand): Promise<Vehicle> {
    const transaction: { vehicleId: string } =
      await this.entityManager.transaction(async (tx: EntityManager) => {
        const created: { id: string } = await tx.query(
          VEHICLE_QUERIES.INSERT_VEHICLE,
          [
            vehicle.userId,
            vehicle.alias,
            vehicle.plate ?? null,
            vehicle.vehicleTypeCode,
            vehicle.fuelTypeCode,
            vehicle.cargoTypeCode ?? null,
            vehicle.engine?.displacementCc ?? null,
            vehicle.engine?.cylinders ?? null,
            vehicle.engine?.horsepower ?? null,
            vehicle.year ?? null,
            vehicle.brand ?? null,
            vehicle.model ?? null,
            vehicle.dimensions.weightKg,
            vehicle.dimensions.heightM ?? null,
            vehicle.dimensions.lengthM ?? null,
            vehicle.dimensions.widthM ?? null,
            vehicle.dimensions.axles,
            vehicle.cargoWeightKg ?? null,
            vehicle.maxCargoCapacityKg ?? null,
            vehicle.efficiency?.cityKmpl ?? null,
            vehicle.efficiency?.hwyKmpl ?? null,
            vehicle.efficiency?.tankCapacityL ?? null,
            vehicle.emissionClass ?? null,
          ],
        );

        this.logger.log(`Vehicle created: ${created.id}`);
        return {
          vehicleId: created.id,
        };
      });

    return (await this.findById(transaction.vehicleId))!;
  }

  async update(
    id: string,
    userId: string,
    vehicle: UpdateVehicleCommand,
  ): Promise<Vehicle> {
    await this.entityManager.transaction(async (tx: EntityManager) => {
      await tx.query(VEHICLE_QUERIES.UPDATE_VEHICLE, [
        id,
        userId,
        vehicle.alias ?? null,
        vehicle.plate ?? null,
        vehicle.vehicleTypeCode ?? null,
        vehicle.fuelTypeCode ?? null,
        vehicle.cargoTypeCode ?? null,
        vehicle.engine?.displacementCc ?? null,
        vehicle.engine?.cylinders ?? null,
        vehicle.engine?.horsepower ?? null,
        vehicle.year ?? null,
        vehicle.brand ?? null,
        vehicle.model ?? null,
        vehicle.dimensions?.weightKg ?? null,
        vehicle.dimensions?.heightM ?? null,
        vehicle.dimensions?.lengthM ?? null,
        vehicle.dimensions?.widthM ?? null,
        vehicle.dimensions?.axles ?? null,
        vehicle.cargoWeightKg ?? null,
        vehicle.maxCargoCapacityKg ?? null,
        vehicle.efficiency?.cityKmpl ?? null,
        vehicle.efficiency?.hwyKmpl ?? null,
        vehicle.efficiency?.tankCapacityL ?? null,
        vehicle.emissionClass ?? null,
      ]);

      this.logger.log(`Vehicle updated: ${id}`);
    });

    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    return await this.entityManager.query(VEHICLE_QUERIES.DELETE_VEHICLE, [id]);
  }

  private toDomain(row: Record<string, any>): Vehicle {
    return {
      id: row.id,
      userId: row.user_id,
      alias: row.alias,
      plate: row.plate ?? null,
      vehicleType: {
        code: row.vt_code,
        description: row.vt_description,
        axles: Number(row.vt_axles),
        category: row.vt_category,
      },
      fuelType: {
        code: row.ft_code,
        name: row.ft_name,
        unit: row.ft_unit,
      },
      cargoType: row.ct_code ? { code: row.ct_code, name: row.ct_name } : null,
      engine: {
        displacementCc:
          row.engine_displacement_cc != null
            ? Number(row.engine_displacement_cc)
            : null,
        cylinders:
          row.engine_cylinders != null ? Number(row.engine_cylinders) : null,
        horsepower: row.horsepower != null ? Number(row.horsepower) : null,
      },
      year: row.year != null ? Number(row.year) : null,
      brand: row.brand ?? null,
      model: row.model ?? null,
      dimensions: {
        weightKg: Number(row.weight_kg),
        heightM: row.height_m != null ? Number(row.height_m) : null,
        lengthM: row.length_m != null ? Number(row.length_m) : null,
        widthM: row.width_m != null ? Number(row.width_m) : null,
        axles: Number(row.axles),
      },
      cargoWeightKg:
        row.cargo_weight_kg != null ? Number(row.cargo_weight_kg) : null,
      maxCargoCapacityKg:
        row.max_cargo_capacity_kg != null
          ? Number(row.max_cargo_capacity_kg)
          : null,
      efficiency: {
        cityKmpl:
          row.fuel_efficiency_city_kmpl != null
            ? Number(row.fuel_efficiency_city_kmpl)
            : null,
        hwyKmpl:
          row.fuel_efficiency_hwy_kmpl != null
            ? Number(row.fuel_efficiency_hwy_kmpl)
            : null,
        tankCapacityL:
          row.fuel_tank_capacity_l != null
            ? Number(row.fuel_tank_capacity_l)
            : null,
      },
      emissionClass: row.emission_class ?? null,
      tags: Array.isArray(row.tags)
        ? (row.tags as string[])
        : (JSON.parse((row.tags as string) ?? '[]') as string[]),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
