import { ApiProperty } from '@nestjs/swagger';
import { CoordinateDto } from './calculate-toll-request.dto';
import { RouteDto } from './route.dto';

export class VehicleSummaryDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'Mi Versa' })
  alias: string;

  @ApiProperty({ example: '2AxlesAuto' })
  vehicleType: string;
}

export class TollCalculationResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  calculationId: string;

  @ApiProperty({ type: VehicleSummaryDto })
  vehicle: VehicleSummaryDto;

  @ApiProperty({ type: CoordinateDto })
  origin: CoordinateDto;

  @ApiProperty({ type: CoordinateDto })
  destination: CoordinateDto;

  @ApiProperty({ type: [RouteDto] })
  routes: RouteDto[];

  @ApiProperty({ example: 'TOLLGURU', enum: ['TOLLGURU', 'MOCK'] })
  provider: string;

  @ApiProperty({ example: '2025-05-20T08:00:05.123Z' })
  calculatedAt: Date;
}
