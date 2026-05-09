import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BoothCatalogServicePort } from '../../domain/ports/in/booth-catalog-service.port';
import { TollBoothSummaryDto } from '../../application/dto/toll-booth-summary.dto';
import { TollBoothCatalog } from '../../domain/model/toll-booth-catalog.model';

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
  ): Promise<{ data: TollBoothCatalog[]; total: number }> {
    return this.boothServicePort.findAll(page, limit);
  }
}
