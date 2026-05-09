import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatalogServicePort } from '../../domain/ports/in/catalog-service.port';
import { CargoTypeResponseDto } from '../../application/dto/cargo-type-response.dto';
import { Public } from '../../../shared/decorators/public.decorator';
import { FuelTypeResponseDto } from '../../application/dto/fuel-type-response.dto';
import { TagSystemResponseDto } from '../../application/dto/tag-system-response.dto';
import { TollOperatorResponseDto } from '../../application/dto/toll-operator-response.dto';
import { VehicleTypeResponseDto } from '../../application/dto/vehicle-type-response.dto';

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogController {
  constructor(private readonly catalogApplicationService: CatalogServicePort) {}

  @Public()
  @Get('cargo-types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Cargo types' })
  @ApiResponse({ status: 200, type: CargoTypeResponseDto })
  findCargoType(): Promise<CargoTypeResponseDto[]> {
    return this.catalogApplicationService.findCargoTypeByOrderCode();
  }

  @Public()
  @Get('fuel-types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Fuel types' })
  @ApiResponse({ status: 200, type: FuelTypeResponseDto })
  findFuelType(): Promise<FuelTypeResponseDto[]> {
    return this.catalogApplicationService.findFuelTypeByOrderCode();
  }

  @Public()
  @Get('tag-systems')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Tag systems' })
  @ApiResponse({ status: 200, type: TagSystemResponseDto })
  findTagSystem(): Promise<TagSystemResponseDto[]> {
    return this.catalogApplicationService.findTagSystemByOrderCode();
  }

  @Public()
  @Get('toll-operators')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Toll operators' })
  @ApiResponse({ status: 200, type: TollOperatorResponseDto })
  findTollOperator(): Promise<TollOperatorResponseDto[]> {
    return this.catalogApplicationService.findTollOperatorByOrderCode();
  }

  @Public()
  @Get('vehicle-types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Vehicles types' })
  @ApiResponse({ status: 200, type: VehicleTypeResponseDto })
  findVehicleType(): Promise<VehicleTypeResponseDto[]> {
    return this.catalogApplicationService.findVehicleTypeByOrderCode();
  }
}
