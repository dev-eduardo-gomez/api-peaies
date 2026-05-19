import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../domain/model/payment-method.enum';

export class CoordinateDto {
  @ApiProperty({ example: 19.4326 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -99.1332 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ example: 'Ciudad de México, CDMX' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class CalculateTollRequestDto {
  @ApiProperty({ example: '74da148b-145d-4d8e-9fba-652956178562' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ type: CoordinateDto })
  @ValidateNested()
  @Type(() => CoordinateDto)
  origin: CoordinateDto;

  @ApiProperty({ type: CoordinateDto })
  @ValidateNested()
  @Type(() => CoordinateDto)
  destination: CoordinateDto;

  @ApiPropertyOptional({ type: [CoordinateDto], maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  waypoints?: CoordinateDto[];

  @ApiPropertyOptional({ example: '2025-05-20T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  preferredPaymentMethod?: PaymentMethod = PaymentMethod.CASH;
}
