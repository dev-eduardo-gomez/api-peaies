import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VehicleServicePort } from '../../domain/ports/in/vehicle-service.port';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { CreateVehicleRequestDto } from '../../application/dto/create-vehicle-request.dto';
import { UpdateVehicleRequestDto } from '../../application/dto/update-vehicle-request.dto';
import { VehicleResponseDto } from '../../application/dto/vehicle-response.dto';
import { VehicleNotFoundException } from '../../domain/exceptions/vehicle-not-found.exception';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleServicePort: VehicleServicePort) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({ status: 201, type: VehicleResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Plate already registered for this user',
  })
  create(
    @CurrentUser() userId: string,
    @Body() dto: CreateVehicleRequestDto,
  ): Promise<VehicleResponseDto> {
    return this.vehicleServicePort.create(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all vehicles of the current user' })
  @ApiResponse({ status: 200, type: [VehicleResponseDto] })
  findAll(@CurrentUser() userId: string): Promise<VehicleResponseDto[]> {
    return this.vehicleServicePort.findAllByUserId(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiResponse({ status: 200, type: VehicleResponseDto })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.vehicleServicePort.findById(id);
    if (!vehicle) throw new VehicleNotFoundException(id);
    return vehicle;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiResponse({ status: 200, type: VehicleResponseDto })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({
    status: 409,
    description: 'Plate already registered for this user',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateVehicleRequestDto,
  ): Promise<VehicleResponseDto> {
    return this.vehicleServicePort.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehicleServicePort.delete(id);
  }
}
