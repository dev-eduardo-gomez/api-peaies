import { ApiProperty } from '@nestjs/swagger';

export class CostBreakdownDto {
  @ApiProperty({ example: 420.0 })
  tagCost: number;

  @ApiProperty({ example: 520.0 })
  cashCost: number;

  @ApiProperty({ example: 890.0 })
  fuelCost: number;

  @ApiProperty({ example: 1310.0 })
  grandTotal: number;

  @ApiProperty({ example: 'MXN' })
  currency: string;
}
