import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCalculationHistoryUseCase } from '../../domain/ports/in/get-calculation-history.use-case';
import { TollCalculationRepositoryPort } from '../../domain/ports/out/toll-calculation-repository.port';
import { VehicleRepositoryPort } from '../../../vehicles/domain/ports/out/vehicle-repository.port';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TollCalculationResponseDto, VehicleSummaryDto } from '../../application/dto/toll-calculation-response.dto';
import {
  PaginatedCalculationsResponseDto,
  TollCalculationSummaryDto,
} from '../../application/dto/toll-calculation-summary.dto';
import { TollWebMapper } from './mapper/toll-web.mapper';

@ApiTags('tolls')
@ApiBearerAuth()
@Controller('tolls')
export class HistoryController {
  constructor(
    @Inject(GetCalculationHistoryUseCase)
    private readonly getHistory: GetCalculationHistoryUseCase,
    @Inject(TollCalculationRepositoryPort)
    private readonly calcRepo: TollCalculationRepositoryPort,
    @Inject(VehicleRepositoryPort)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get toll calculation history (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, type: PaginatedCalculationsResponseDto })
  async history(
    @CurrentUser() userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedCalculationsResponseDto> {
    const result = await this.getHistory.execute({ userId, page, limit });

    const data: TollCalculationSummaryDto[] = result.data.map((c) =>
      TollWebMapper.toSummaryDto(c),
    );

    return {
      data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a toll calculation by ID' })
  @ApiResponse({ status: 200, type: TollCalculationResponseDto })
  @ApiResponse({ status: 404, description: 'Calculation not found' })
  async findOne(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TollCalculationResponseDto> {
    const calculation = await this.calcRepo.findById(id, userId);
    if (!calculation) throw new NotFoundException(`Toll calculation '${id}' not found`);

    const vehicle = await this.vehicleRepo.findById(calculation.vehicleId);
    const vehicleSummary: VehicleSummaryDto = {
      id: vehicle?.id ?? calculation.vehicleId,
      alias: vehicle?.alias ?? '',
      vehicleType: vehicle?.vehicleType.code ?? '',
    };

    return TollWebMapper.toCalculationResponse(calculation, vehicleSummary);
  }
}
