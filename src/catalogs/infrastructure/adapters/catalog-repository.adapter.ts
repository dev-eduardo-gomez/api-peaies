import { Injectable } from '@nestjs/common';
import { CatalogRepositoryPort } from '../../domain/ports/out/catalog-repository.port';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  CargoType,
  FuelType,
  TagSystem,
  TollOperatorType,
  VehicleType,
} from '../../domain/model/catalog-types.model';
import { CATALOG_QUERIES } from '../persistence/catalog.queries';

@Injectable()
export class CatalogRepositoryAdapter extends CatalogRepositoryPort {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    super();
  }

  async findCargoTypeByOrderCode(): Promise<CargoType[]> {
    const rows: CargoType[] = await this.entityManager.query(
      CATALOG_QUERIES.FIND_CARGO_TYPES_ORDER_BY_CODE,
    );
    return rows.length > 0 ? rows : [];
  }

  async findFuelTypeByOrderCode(): Promise<FuelType[]> {
    const rows: FuelType[] = await this.entityManager.query(
      CATALOG_QUERIES.FIND_FUEL_TYPES_ORDER_BY_CODE,
    );
    return rows.length > 0 ? rows : [];
  }

  async findTagSystemByOrderCode(): Promise<TagSystem[]> {
    const rows: TagSystem[] = await this.entityManager.query(
      CATALOG_QUERIES.FIND_TOLL_TAG_SYSTEMS_ORDER_BY_CODE,
    );
    return rows.length > 0 ? rows : [];
  }

  async findTollOperatorByOrderCode(): Promise<TollOperatorType[]> {
    const rows: TollOperatorType[] = await this.entityManager.query(
      CATALOG_QUERIES.FIND_TOLL_OPERATORS_ORDER_BY_CODE,
    );
    return rows.length > 0 ? rows : [];
  }

  async findVehicleTypeByOrderCode(): Promise<VehicleType[]> {
    const rows: VehicleType[] = await this.entityManager.query(
      CATALOG_QUERIES.FIND_VEHICLE_TYPES_ORDER_BY_CODE,
    );
    return rows.length > 0 ? rows : [];
  }
}
