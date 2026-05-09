import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TollBoothRateDto {
  @ApiProperty({ example: '2AxlesAuto' })
  vehicleTypeCode: string;

  @ApiPropertyOptional({ example: 109.0 })
  cash: number | null;

  @ApiPropertyOptional({ example: 109.0 })
  tagPrimary: number | null;

  @ApiPropertyOptional({ example: 98.0 })
  tagSecondary: number | null;

  @ApiPropertyOptional({ example: 109.0 })
  licensePlateCost: number | null;

  @ApiPropertyOptional({ example: 109.0 })
  prepaidCardCost: number | null;

  @ApiProperty({ example: 'MXN' })
  currency: string;

  @ApiProperty({ example: '2024-01-01' })
  validFrom: Date;

  @ApiProperty({
    example: 'OFFICIAL',
    enum: ['OFFICIAL', 'MANUAL', 'TOLLGURU'],
  })
  source: string;
}
