import { ApiProperty } from '@nestjs/swagger';

export class TollBoothRate {
  @ApiProperty({ example: '2AxlesAuto' })
  vehicleType: string;

  @ApiProperty({ example: 109.0 })
  cash: number;

  @ApiProperty({ example: 109.0 })
  tagPrimary: number;

  @ApiProperty({ example: 109.0 })
  tagSecondary: number;

  @ApiProperty({ example: 109.0 })
  licensePlateCost: number;

  @ApiProperty({ example: 109.0 })
  prepaidCardCost: number;
}
