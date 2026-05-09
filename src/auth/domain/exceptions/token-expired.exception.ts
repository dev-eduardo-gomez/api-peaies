import { UnauthorizedException } from '@nestjs/common';

export class TokenExpiredException extends UnauthorizedException {
  constructor(message = 'Token expirado') {
    super(message);
  }
}
