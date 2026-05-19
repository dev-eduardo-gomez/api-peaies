import { Money } from './money.model';
import { TollBooth } from './toll-booth.model';

export interface TollSection {
  sectionId?: string;
  name: string;
  entryBooth: TollBooth;
  exitBooth: TollBooth;
  cost: Money;
}
