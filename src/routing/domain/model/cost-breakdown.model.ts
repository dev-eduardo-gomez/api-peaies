import { Money } from './money.model';

export interface CostBreakdown {
  tagCost: Money;
  cashCost: Money;
  fuelCost: Money;
  grandTotal: Money;
}
