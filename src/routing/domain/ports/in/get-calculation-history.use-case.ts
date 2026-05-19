import { TollCalculation } from '../../model/toll-calculation.model';

export interface GetCalculationHistoryQuery {
  userId: string;
  page: number;
  limit: number;
}

export interface PaginatedCalculations {
  data: TollCalculation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class GetCalculationHistoryUseCase {
  abstract execute(query: GetCalculationHistoryQuery): Promise<PaginatedCalculations>;
}
