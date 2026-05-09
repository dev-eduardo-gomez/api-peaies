import { NotFoundException } from '@nestjs/common';

export class BoothNotFoundException extends NotFoundException {
  constructor(id: string, message = `Caseta con ID: ${id} no encontrada`) {
    super(message, id);
  }
}
