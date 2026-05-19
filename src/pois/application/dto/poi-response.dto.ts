import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '../../domain/model/poi-type.enum';

export class PoiLocationDto {
  @ApiProperty({ example: 19.432608 }) lat: number;
  @ApiProperty({ example: -99.133209 }) lng: number;
}

export class PoiResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'Gasolinera Pemex Reforma' })
  name: string;

  @ApiProperty({ enum: PoiType, example: PoiType.GAS_STATION })
  type: PoiType;

  @ApiPropertyOptional({ example: 'Pemex' })
  brand: string | null;

  @ApiProperty({ type: PoiLocationDto })
  location: PoiLocationDto;

  @ApiPropertyOptional({ example: 'Av. Reforma 450, CDMX' })
  address: string | null;

  @ApiPropertyOptional({
    example: { hours: '24/7', services: ['diesel', 'magna', 'premium'] },
    description: 'Metadatos adicionales (horarios, servicios, precios)',
  })
  metadata: Record<string, unknown> | null;

  @ApiPropertyOptional({
    example: 2.3,
    description: 'Distancia al punto de referencia en km',
  })
  distanceKm: number | undefined;

  @ApiProperty({ example: 'MANUAL', enum: ['MANUAL', 'OSM', 'GOOGLE'] })
  source: string;

  @ApiProperty({ example: false })
  verified: boolean;
}
