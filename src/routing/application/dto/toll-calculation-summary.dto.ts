import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoordinateSummaryDto {
  @ApiProperty({ example: 19.4326 }) lat: number;
  @ApiProperty({ example: -99.1332 }) lng: number;
  @ApiPropertyOptional({ example: 'Ciudad de México' }) address?: string;
}

export class TollCalculationSummaryDto {
  @ApiProperty({ example: 'uuid-v4' }) calculationId: string;
  @ApiProperty({ type: CoordinateSummaryDto }) origin: CoordinateSummaryDto;
  @ApiProperty({ type: CoordinateSummaryDto }) destination: CoordinateSummaryDto;
  @ApiProperty({ example: 2 }) routeCount: number;
  @ApiProperty({ example: 1340.0 }) cheapestRouteCost: number;
  @ApiProperty({ example: 'MXN' }) currency: string;
  @ApiProperty({ example: 'TOLLGURU', enum: ['TOLLGURU', 'MOCK'] }) provider: string;
  @ApiProperty({ example: '2025-05-20T08:00:05.123Z' }) calculatedAt: Date;
}

export class PaginatedCalculationsResponseDto {
  @ApiProperty({ type: [TollCalculationSummaryDto] }) data: TollCalculationSummaryDto[];
  @ApiProperty({ example: 47 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 10 }) limit: number;
  @ApiProperty({ example: 5 }) totalPages: number;
}
