import { ApiProperty } from '@nestjs/swagger';
import { RouteDto } from './route.dto';

export class RouteComparisonDto {
  @ApiProperty({ example: 56 })
  timeDifferenceMinutes: number;

  @ApiProperty({ example: 70.0 })
  costDifferenceMxn: number;

  @ApiProperty({
    example: 'La ruta más barata ahorra $70.00 MXN a costa de 56 minutos adicionales.',
  })
  recommendation: string;
}

export class CompareRoutesResponseDto {
  @ApiProperty({ example: false })
  isSameRoute: boolean;

  @ApiProperty({ type: RouteDto })
  fasterRoute: RouteDto;

  @ApiProperty({ type: RouteDto })
  cheaperRoute: RouteDto;

  @ApiProperty({ type: RouteComparisonDto })
  comparison: RouteComparisonDto;
}
