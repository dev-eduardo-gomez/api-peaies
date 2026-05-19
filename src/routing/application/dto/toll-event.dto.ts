import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../domain/model/payment-method.enum';
import type { TollEventType } from '../../domain/model/toll-event.type';

export class TollEventDto {
  @ApiProperty({ example: 1 })
  sequence: number;

  @ApiPropertyOptional({ example: 'uuid-v4' })
  boothId?: string;

  @ApiProperty({ example: 'Caseta Ciudad del Carmen' })
  boothName: string;

  @ApiPropertyOptional({ example: 18.6126 })
  lat?: number;

  @ApiPropertyOptional({ example: -91.8609 })
  lng?: number;

  @ApiProperty({ example: 45.0 })
  cashCost: number;

  @ApiProperty({ example: 35.0 })
  tagCost: number;

  @ApiProperty({ example: 35.0 })
  costApplied: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.TAG })
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'PAY' })
  eventType: TollEventType;

  @ApiPropertyOptional({ example: '2025-05-20T09:30:00.000Z' })
  arrivalTime?: Date;
}
