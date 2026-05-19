import { NotFoundException } from '@nestjs/common';

export class CalculationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Toll calculation '${id}' not found`);
  }
}
