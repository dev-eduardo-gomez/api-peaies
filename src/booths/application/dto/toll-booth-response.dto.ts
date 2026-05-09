import { ApiProperty } from '@nestjs/swagger';
import { TollBoothRateDto } from './toll-booth-rate.dto';

export class TollBoothOperatorDto {
  @ApiProperty({ example: 'CAPUFE' })
  code: string;

  @ApiProperty({ example: 'Caminos y Puentes Federales' })
  name: string;
}

export class AcceptedTagDto {
  @ApiProperty({ example: 'IAVE' })
  code: string;

  @ApiProperty({ example: true })
  isPrimary: boolean;
}

export class TollBoothResponseDto {
  @ApiProperty({ example: '48f72547-d9eb-4edc-8162-0e658b847c84' })
  id: string;

  @ApiProperty({ example: 'Cd. Del Carmen - V. Hermosa - Ctra Pte Zacatal' })
  name: string;

  @ApiProperty({ example: 'Puente El Zacatal', nullable: true })
  road: string | null;

  @ApiProperty({ example: 'Campeche', nullable: true })
  state: string | null;

  @ApiProperty({ example: 'MEX' })
  country: string;

  @ApiProperty({ example: 91.868085 })
  lat: number;

  @ApiProperty({ example: 18.612621 })
  lng: number;

  @ApiProperty({ example: 'BARRIER', enum: ['BARRIER', 'TICKET_SYSTEM'] })
  systemType: string;

  @ApiProperty({ example: 4.5, nullable: true })
  heightRestrictionM: number | null;

  @ApiProperty({ type: TollBoothOperatorDto, nullable: true })
  operator: TollBoothOperatorDto | null;

  @ApiProperty({ type: [TollBoothRateDto] })
  rates: TollBoothRateDto[];

  @ApiProperty({ type: [AcceptedTagDto] })
  tags: AcceptedTagDto[];

  @ApiProperty({ example: '2026-05-03 01:16:58.819294 +00:00' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-03 01:16:58.819294 +00:00' })
  updatedAt: Date;
}
