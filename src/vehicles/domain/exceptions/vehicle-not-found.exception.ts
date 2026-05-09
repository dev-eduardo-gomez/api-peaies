import { NotFoundException } from '@nestjs/common';

export class VehicleNotFoundException extends NotFoundException {
  constructor(message = 'Vehiclo no encontrado') {
    super(message);
  }
}
