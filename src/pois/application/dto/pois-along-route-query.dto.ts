import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '../../domain/model/poi-type.enum';

export class PoisAlongRouteQueryDto {
  @ApiPropertyOptional({
    enum: PoiType,
    description: 'Filtrar por tipo de POI',
  })
  @IsOptional()
  @IsEnum(PoiType)
  type?: PoiType;

  @ApiPropertyOptional({
    example: 500,
    default: 500,
    description: 'Ancho del corredor alrededor de la ruta en metros (máx 2000)',
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(2000)
  @Type(() => Number)
  corridorMeters?: number = 500;
}
