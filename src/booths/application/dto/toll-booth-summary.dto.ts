import { ApiProperty } from '@nestjs/swagger';
import { TollBoothOperatorDto } from './toll-booth-response.dto';

export class TollBoothSummaryDto {
  @ApiProperty({ example: '48f72547-d9eb-4edc-8162-0e658b847c84' })
  id: string;

  @ApiProperty({ example: 'Cd. Del Carmen - V. Hermosa - Ctra Pte Zacatal' })
  name: string;

  @ApiProperty({ example: 'Puente El Zacatal', nullable: true })
  road: string;

  @ApiProperty({ example: 'Campeche', nullable: true })
  state: string;

  @ApiProperty({ example: 'MEX' })
  country: string;

  @ApiProperty({ example: 91.868085 })
  lat: number;

  @ApiProperty({ example: 18.612621 })
  lng: number;

  @ApiProperty({ example: 'BARRIER', enum: ['BARRIER', 'TICKET_SYSTEM'] })
  systemType: string;

  @ApiProperty({ example: 4.5, nullable: true })
  heightRestrictionM: number;

  @ApiProperty({ type: TollBoothOperatorDto, nullable: true })
  operator: TollBoothOperatorDto | null;
}
