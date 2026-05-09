import { ConflictException } from '@nestjs/common';

export class DuplicatePlateException extends ConflictException {
  constructor(message = 'Placas duplicadas') {
    super(message);
  }
}
