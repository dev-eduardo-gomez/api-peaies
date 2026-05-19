import { Money } from '../../model/money.model';

export abstract class CurrencyConverterPort {
  abstract convert(
    amount: Money,
    targetCurrency: 'MXN' | 'USD',
  ): Promise<Money>;
}
