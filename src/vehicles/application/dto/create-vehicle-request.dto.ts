import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CargoTypeCode } from '../../domain/model/cargo-type.enum';
import { FuelTypeCode } from '../../domain/model/fuel-type.enum';
import { VehicleTypeCode } from '../../domain/model/vehicle-type.enum';

export class EngineDto {
  @ApiPropertyOptional({ example: 1600 })
  @IsInt()
  @Min(50)
  @IsOptional()
  displacementCc: number | null;

  @ApiPropertyOptional({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(16)
  @IsOptional()
  cylinders: number | null;

  @ApiPropertyOptional({ example: 106 })
  @IsInt()
  @Min(1)
  @IsOptional()
  horsepower: number | null;
}

export class DimensionsDto {
  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  weightKg: number;

  @ApiPropertyOptional({ example: 1.5 })
  @IsNumber()
  @IsOptional()
  heightM: number | null;

  @ApiPropertyOptional({ example: 4.3 })
  @IsNumber()
  @IsOptional()
  lengthM: number | null;

  @ApiPropertyOptional({ example: 1.8 })
  @IsNumber()
  @IsOptional()
  widthM: number | null;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(2)
  @Max(9)
  @IsNotEmpty()
  axles: number;
}

export class FuelEfficiencyDto {
  @ApiPropertyOptional({ example: 12.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cityKmpl: number | null;

  @ApiPropertyOptional({ example: 16.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hwyKmpl: number | null;

  @ApiPropertyOptional({ example: 45 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  tankCapacityL: number | null;
}

export class CreateVehicleRequestDto {
  @ApiProperty({ example: 'Mi Versa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  alias: string;

  @ApiPropertyOptional({ example: 'ABC-123' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  plate: string | null;

  @ApiProperty({ enum: VehicleTypeCode, example: VehicleTypeCode.AUTO_2AXLES })
  @IsEnum(VehicleTypeCode)
  @IsNotEmpty()
  vehicleTypeCode: VehicleTypeCode;

  @ApiProperty({ enum: FuelTypeCode, example: FuelTypeCode.MAGNA })
  @IsEnum(FuelTypeCode)
  @IsNotEmpty()
  fuelTypeCode: FuelTypeCode;

  @ApiPropertyOptional({ enum: CargoTypeCode, example: CargoTypeCode.NONE })
  @IsEnum(CargoTypeCode)
  @IsOptional()
  cargoTypeCode: CargoTypeCode | null;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => EngineDto)
  @IsOptional()
  engine: EngineDto | null;

  @ApiPropertyOptional({ example: 2022 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  year: number | null;

  @ApiPropertyOptional({ example: 'Nissan' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  brand: string | null;

  @ApiPropertyOptional({ example: 'Versa' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  model: string | null;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DimensionsDto)
  @IsNotEmpty()
  dimensions: DimensionsDto;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cargoWeightKg: number | null;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCargoCapacityKg: number | null;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => FuelEfficiencyDto)
  @IsOptional()
  efficiency: FuelEfficiencyDto | null;

  @ApiPropertyOptional({ example: 'EURO5' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  emissionClass: string | null;

  @ApiPropertyOptional({ example: ['IAVE', 'TAG_PASE'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags: string[];
}
