import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleTypeInfoDto {
  @ApiProperty({ example: '2AxlesAuto' })
  code: string;

  @ApiProperty({ example: 'Car, SUV or Pickup truck' })
  description: string;

  @ApiProperty({ example: 2 })
  axles: number;

  @ApiProperty({ example: 'AUTO' })
  category: string;
}

export class FuelTypeInfoDto {
  @ApiProperty({ example: 'MAGNA' })
  code: string;

  @ApiProperty({ example: 'Gasolina Magna' })
  name: string;

  @ApiProperty({ example: 'liter' })
  unit: string;
}

export class CargoTypeInfoDto {
  @ApiProperty({ example: 'NONE' })
  code: string;

  @ApiProperty({ example: 'Sin carga' })
  name: string;
}

export class EngineResponseDto {
  @ApiPropertyOptional({ example: 1600 })
  displacementCc: number | null;

  @ApiPropertyOptional({ example: 4 })
  cylinders: number | null;

  @ApiPropertyOptional({ example: 106 })
  horsepower: number | null;
}

export class DimensionsResponseDto {
  @ApiProperty({ example: 1200 })
  weightKg: number;

  @ApiPropertyOptional({ example: 1.5 })
  heightM: number | null;

  @ApiPropertyOptional({ example: 4.3 })
  lengthM: number | null;

  @ApiPropertyOptional({ example: 1.8 })
  widthM: number | null;

  @ApiProperty({ example: 2 })
  axles: number;
}

export class FuelEfficiencyResponseDto {
  @ApiPropertyOptional({ example: 12.5 })
  cityKmpl: number | null;

  @ApiPropertyOptional({ example: 16.0 })
  hwyKmpl: number | null;

  @ApiPropertyOptional({ example: 45 })
  tankCapacityL: number | null;
}

export class VehicleResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty()
  vehicleType: VehicleTypeInfoDto;

  @ApiProperty()
  fuelType: FuelTypeInfoDto;

  @ApiPropertyOptional()
  cargoType: CargoTypeInfoDto | null;

  @ApiProperty({ example: 'Mi Versa' })
  alias: string;

  @ApiPropertyOptional({ example: 'ABC-123' })
  plate: string | null;

  @ApiPropertyOptional({ example: 2022 })
  year: number | null;

  @ApiPropertyOptional({ example: 'Nissan' })
  brand: string | null;

  @ApiPropertyOptional({ example: 'Versa' })
  model: string | null;

  @ApiProperty()
  engine: EngineResponseDto;

  @ApiProperty()
  dimensions: DimensionsResponseDto;

  @ApiPropertyOptional({ example: 0 })
  cargoWeightKg: number | null;

  @ApiPropertyOptional({ example: 500 })
  maxCargoCapacityKg: number | null;

  @ApiProperty()
  efficiency: FuelEfficiencyResponseDto;

  @ApiPropertyOptional({ example: 'EURO5' })
  emissionClass: string | null;

  @ApiProperty({ example: ['IAVE', 'TAG_PASE'] })
  tags: string[];

  @ApiProperty()
  createdAt: Date;
}
