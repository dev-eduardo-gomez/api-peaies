import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BoothCatalogServicePort } from '../../domain/ports/in/booth-catalog-service.port';
import { NearbyBoothsQueryDto } from '../../application/dto/nearby-booths-query.dto';
import { TollBoothSummaryDto } from '../../application/dto/toll-booth-summary.dto';
import { TollBoothResponseDto } from '../../application/dto/toll-booth-response.dto';

@ApiTags('Booths')
@ApiBearerAuth()
@Controller('booths')
export class BoothController {
  constructor(private readonly boothServicePort: BoothCatalogServicePort) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all booths' })
  @ApiResponse({ status: 200, type: TollBoothSummaryDto })
  findAll(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ): Promise<{
    data: TollBoothSummaryDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.boothServicePort.findAll(page, limit);
  }

  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all nearby' })
  @ApiResponse({ status: 200, type: TollBoothResponseDto })
  @ApiResponse({
    status: 400,
    description: 'radiusKm must not be greater than 100',
  })
  findNearby(
    @Query() query: NearbyBoothsQueryDto,
  ): Promise<TollBoothResponseDto[]> {
    return this.boothServicePort.findNearby(
      query.lat,
      query.lng,
      query.radiusKm,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find booths by id' })
  @ApiResponse({ status: 200, type: TollBoothResponseDto })
  @ApiResponse({ status: 404, description: 'Not found booth' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TollBoothResponseDto> {
    return this.boothServicePort.findById(id);
  }
}
