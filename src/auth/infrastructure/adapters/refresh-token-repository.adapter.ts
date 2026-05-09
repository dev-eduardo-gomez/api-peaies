import { Injectable } from '@nestjs/common';
import { RefreshTokenRepositoryPort } from '../../domain/ports/out/refresh-token-repository.port';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { RefreshToken } from '../../domain/model/refresh-token.model';
import { AUTH_QUERIES } from '../persistence/auth.queries';

@Injectable()
export class RefreshTokenRepositoryAdapter extends RefreshTokenRepositoryPort {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    super();
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const rows: RefreshToken[] = await this.entityManager.query(
      AUTH_QUERIES.FIND_REFRESH_BY_HASH,
      [hash],
    );

    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    if (token.revoked) {
      await this.entityManager.query(AUTH_QUERIES.REVOKE_REFRESH, [token.id]);
    } else {
      await this.entityManager.query(AUTH_QUERIES.INSERT_REFRESH, [
        token.id,
        token.userId,
        token.tokenHash,
        token.expiresAt,
      ]);
    }

    return token;
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.entityManager.query(AUTH_QUERIES.REVOKE_ALL_USER_TOKENS, [
      userId,
    ]);
  }

  private toDomain(row: any): RefreshToken {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      revoked: row.revoked,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
    };
  }
}
