import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class NearbyBoothsQueryDto {
  @ApiProperty({
    example: 18.4153,
    description: 'Latitud del punto de búsqueda',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    example: -92.0954,
    description: 'Longitud del punto de búsqueda',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({
    example: 5,
    description: 'Radio de búsqueda en kilómetros',
    default: 5,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm: number = 5;
}
