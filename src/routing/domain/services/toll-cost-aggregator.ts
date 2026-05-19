import { Injectable } from '@nestjs/common';
import { roundMxn } from '../../../shared/util/money.util';
import { Money } from '../model/money.model';
import { TollBooth } from '../model/toll-booth.model';

export interface AggregatedTollCosts {
  cashCost: Money;
  tagCost: Money;
}

@Injectable()
export class TollCostAggregator {
  aggregate(tolls: TollBooth[], currency: 'MXN' | 'USD'): AggregatedTollCosts {
    let cashTotal = 0;
    let tagTotal = 0;

    for (const toll of tolls) {
      cashTotal += toll.cashCost.amount;
      tagTotal += toll.tagCost.amount;
    }

    return {
      cashCost: { amount: roundMxn(cashTotal), currency },
      tagCost: { amount: roundMxn(tagTotal), currency },
    };
  }
}
