import { Money } from './money.model';
import { PaymentMethod } from './payment-method.enum';
import { TollEventType } from './toll-event.type';

export interface TollBooth {
  sequence: number;
  boothId?: string;
  boothName: string;
  lat?: number;
  lng?: number;
  cashCost: Money;
  tagCost: Money;
  costApplied: Money;
  paymentMethod: PaymentMethod;
  eventType: TollEventType;
  arrivalTime?: Date;
}
