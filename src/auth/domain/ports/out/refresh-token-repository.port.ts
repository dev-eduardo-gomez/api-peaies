import { RefreshToken } from '../../model/refresh-token.model';

export abstract class RefreshTokenRepositoryPort {
  abstract findByTokenHash(hash: string): Promise<RefreshToken | null>;
  abstract save(token: RefreshToken): Promise<RefreshToken>;
  abstract revokeAllByUserId(userId: string): Promise<void>;
}
