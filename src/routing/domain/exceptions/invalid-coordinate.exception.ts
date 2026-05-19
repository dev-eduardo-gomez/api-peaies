import { BadRequestException } from '@nestjs/common';

export class InvalidCoordinateException extends BadRequestException {
  constructor(detail: string) {
    super(`Invalid coordinate: ${detail}`);
  }
}
