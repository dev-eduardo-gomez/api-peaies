import { TollCalculation } from '../../model/toll-calculation.model';

export abstract class TollCalculationRepositoryPort {
  abstract save(calculation: TollCalculation): Promise<TollCalculation>;
  abstract findById(
    id: string,
    userId: string,
  ): Promise<TollCalculation | null>;
  abstract findByHash(
    requestHash: string,
    userId: string,
  ): Promise<TollCalculation | null>;
  abstract findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TollCalculation[]; total: number }>;
}
