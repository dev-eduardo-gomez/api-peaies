import { ConflictException } from '@nestjs/common';

export class EmailAlreadyExistsException extends ConflictException {
  constructor(message = 'El email ya está registrado') {
    super(message);
  }
}
