import { CreateVehicleRequestDto } from '../../../application/dto/create-vehicle-request.dto';
import { UpdateVehicleRequestDto } from '../../../application/dto/update-vehicle-request.dto';
import { VehicleResponseDto } from '../../../application/dto/vehicle-response.dto';

export abstract class VehicleServicePort {
  abstract create(
    userId: string,
    dto: CreateVehicleRequestDto,
  ): Promise<VehicleResponseDto>;
  abstract findById(id: string): Promise<VehicleResponseDto | null>;
  abstract findAllByUserId(userId: string): Promise<VehicleResponseDto[]>;
  abstract update(
    id: string,
    userId: string,
    dto: UpdateVehicleRequestDto,
  ): Promise<VehicleResponseDto>;
  abstract delete(id: string): Promise<void>;
}
