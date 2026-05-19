import { IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '../../domain/model/poi-type.enum';

export class NearbyPoisQueryDto {
  @ApiProperty({ example: 19.432608, description: 'Latitud del punto central' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat: number;

  @ApiProperty({
    example: -99.133209,
    description: 'Longitud del punto central',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Radio de búsqueda en kilómetros (máx 50)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  @Type(() => Number)
  radiusKm?: number = 10;

  @ApiPropertyOptional({
    enum: PoiType,
    description: 'Filtrar por tipo de POI',
  })
  @IsOptional()
  @IsEnum(PoiType)
  type?: PoiType;
}
