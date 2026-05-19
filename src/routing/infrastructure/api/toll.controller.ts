import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CalculateTollUseCase } from '../../domain/ports/in/calculate-toll.use-case';
import { CompareRoutesUseCase } from '../../domain/ports/in/compare-routes.use-case';
import { VehicleRepositoryPort } from '../../../vehicles/domain/ports/out/vehicle-repository.port';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { CalculateTollRequestDto } from '../../application/dto/calculate-toll-request.dto';
import { CompareRoutesRequestDto } from '../../application/dto/compare-routes-request.dto';
import { TollCalculationResponseDto, VehicleSummaryDto } from '../../application/dto/toll-calculation-response.dto';
import { CompareRoutesResponseDto } from '../../application/dto/compare-routes-response.dto';
import { TollWebMapper } from './mapper/toll-web.mapper';

@ApiTags('tolls')
@ApiBearerAuth()
@Controller('tolls')
export class TollController {
  constructor(
    @Inject(CalculateTollUseCase)
    private readonly calculateToll: CalculateTollUseCase,
    @Inject(CompareRoutesUseCase)
    private readonly compareRoutesUc: CompareRoutesUseCase,
    @Inject(VehicleRepositoryPort)
    private readonly vehicleRepo: VehicleRepositoryPort,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate toll costs for a route' })
  @ApiResponse({ status: 200, type: TollCalculationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Toll provider unavailable' })
  async calculate(
    @CurrentUser() userId: string,
    @Body() dto: CalculateTollRequestDto,
  ): Promise<TollCalculationResponseDto> {
    const calculation = await this.calculateToll.execute({
      userId,
      vehicleId: dto.vehicleId,
      origin: dto.origin,
      destination: dto.destination,
      waypoints: dto.waypoints,
      departureTime: dto.departureTime ? new Date(dto.departureTime) : undefined,
      preferredPaymentMethod: dto.preferredPaymentMethod,
    });

    const vehicle = await this.vehicleRepo.findById(dto.vehicleId);
    const vehicleSummary: VehicleSummaryDto = {
      id: vehicle?.id ?? dto.vehicleId,
      alias: vehicle?.alias ?? '',
      vehicleType: vehicle?.vehicleType.code ?? '',
    };

    return TollWebMapper.toCalculationResponse(calculation, vehicleSummary);
  }

  @Post('compare-routes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare fastest vs cheapest route' })
  @ApiResponse({ status: 200, type: CompareRoutesResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async compareRoutes(
    @CurrentUser() userId: string,
    @Body() dto: CompareRoutesRequestDto,
  ): Promise<CompareRoutesResponseDto> {
    const diff = await this.compareRoutesUc.execute({
      userId,
      vehicleId: dto.vehicleId,
      origin: dto.origin,
      destination: dto.destination,
      waypoints: dto.waypoints,
      departureTime: dto.departureTime ? new Date(dto.departureTime) : undefined,
    });

    return TollWebMapper.toCompareRoutesResponse(diff);
  }
}
