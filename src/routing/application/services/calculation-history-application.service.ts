import { Inject, Injectable } from '@nestjs/common';
import {
  GetCalculationHistoryQuery,
  GetCalculationHistoryUseCase,
  PaginatedCalculations,
} from '../../domain/ports/in/get-calculation-history.use-case';
import { TollCalculationRepositoryPort } from '../../domain/ports/out/toll-calculation-repository.port';

const MAX_PAGE_LIMIT = 50;

@Injectable()
export class CalculationHistoryApplicationService extends GetCalculationHistoryUseCase {
  constructor(
    @Inject(TollCalculationRepositoryPort)
    private readonly calcRepo: TollCalculationRepositoryPort,
  ) {
    super();
  }

  async execute(
    query: GetCalculationHistoryQuery,
  ): Promise<PaginatedCalculations> {
    const limit = Math.min(query.limit, MAX_PAGE_LIMIT);
    const page = Math.max(query.page, 1);

    const { data, total } = await this.calcRepo.findByUser(
      query.userId,
      page,
      limit,
    );
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }
}
