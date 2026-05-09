import { Injectable } from '@nestjs/common';
import { PasswordEncoderPort } from '../../domain/ports/out/password-encoder.port';
import bcrypt from 'bcryptjs';

@Injectable()
export class BcryptPasswordEncoderAdapter extends PasswordEncoderPort {
  private readonly SALTS_ROUNDS = 10;

  async encode(rawPassword: string): Promise<string> {
    return bcrypt.hash(rawPassword, this.SALTS_ROUNDS);
  }

  async matches(rawPassword: string, encodePassword: string): Promise<boolean> {
    return bcrypt.compare(rawPassword, encodePassword);
  }
}
