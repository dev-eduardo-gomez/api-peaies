import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PoiServicePort } from '../../domain/ports/in/poi-service.port';
import { NearbyPoisQueryDto } from '../../application/dto/nearby-pois-query.dto';
import { PoisAlongRouteQueryDto } from '../../application/dto/pois-along-route-query.dto';
import { PoiResponseDto } from '../../application/dto/poi-response.dto';
import { Poi } from '../../domain/model/poi.model';

@ApiTags('pois')
@ApiBearerAuth()
@Controller('pois')
export class PoiController {
  constructor(private readonly poiService: PoiServicePort) {}

  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find POIs near a coordinate' })
  @ApiResponse({ status: 200, type: PoiResponseDto, isArray: true })
  async findNearby(
    @Query() query: NearbyPoisQueryDto,
  ): Promise<{ data: PoiResponseDto[] }> {
    const pois = await this.poiService.findNearby(
      query.lat,
      query.lng,
      query.radiusKm ?? 10,
      query.type,
    );
    return { data: pois.map((p) => this.toDto(p)) };
  }

  @Get('along-route')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find POIs along a route corridor' })
  @ApiResponse({ status: 200, type: PoiResponseDto, isArray: true })
  async findAlongRoute(
    @Query('polylines') polylines: string,
    @Query() query: PoisAlongRouteQueryDto,
  ): Promise<{ data: PoiResponseDto[] }> {
    const pois = await this.poiService.findAlongRoute(
      polylines.split(','),
      query.corridorMeters ?? 500,
      query.type,
    );
    return { data: pois.map((p) => this.toDto(p)) };
  }

  private toDto(poi: Poi): PoiResponseDto {
    const dto = new PoiResponseDto();
    dto.id = poi.id;
    dto.name = poi.name;
    dto.type = poi.poiType;
    dto.brand = poi.brand;
    dto.location = { lat: poi.lat, lng: poi.lng };
    dto.address = poi.address;
    dto.metadata = poi.metadata;
    dto.distanceKm = poi.distanceKm;
    dto.source = poi.source;
    dto.verified = poi.verified;
    return dto;
  }
}
