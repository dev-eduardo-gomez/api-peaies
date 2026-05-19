import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostBreakdownDto } from './cost-breakdown.dto';
import { TollEventDto } from './toll-event.dto';

export class RouteDto {
  @ApiProperty({ example: 0 })
  routeIndex: number;

  @ApiProperty({ example: ['FASTEST'], type: [String] })
  labels: string[];

  @ApiProperty({ example: true })
  hasTolls: boolean;

  @ApiProperty({ example: 921.4 })
  distanceKm: number;

  @ApiProperty({ example: 542 })
  durationMinutes: number;

  @ApiProperty({ example: 12 })
  tollCount: number;

  @ApiProperty({ type: CostBreakdownDto })
  costs: CostBreakdownDto;

  @ApiProperty({ type: [TollEventDto] })
  tolls: TollEventDto[];

  @ApiProperty({ example: '2025-05-20T17:02:00.000Z' })
  estimatedArrival: Date;

  @ApiPropertyOptional({ example: 'https://maps.google.com/...' })
  googleMapsUrl?: string;
}
