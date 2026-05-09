import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AuthUserRepositoryPort } from '../../domain/ports/out/auth-user-repository.port';
import { AuthUser } from '../../domain/model/auth-user.model';
import { AUTH_QUERIES } from '../persistence/auth.queries';

@Injectable()
export class AuthUserRepositoryAdapter extends AuthUserRepositoryPort {
  private readonly logger = new Logger(AuthUserRepositoryAdapter.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {
    super();
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const rows: AuthUser[] = await this.entityManager.query(
      AUTH_QUERIES.FIND_USER_BY_EMAIL,
      [email],
    );

    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const rows: AuthUser[] = await this.entityManager.query(
      AUTH_QUERIES.FIND_USER_BY_ID,
      [id],
    );

    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows: { exists: boolean }[] = await this.entityManager.query(
      AUTH_QUERIES.EXISTS_BY_EMAIL,
      [email],
    );

    return rows[0].exists;
  }

  async save(user: AuthUser): Promise<AuthUser> {
    await this.entityManager.transaction(async (tx: EntityManager) => {
      const existing: AuthUser[] = await tx.query(
        'SELECT id FROM users WHERE id = $1',
        [user.id],
      );

      if (existing.length === 0) {
        await tx.query(AUTH_QUERIES.INSERT_USER, [
          user.id,
          user.email,
          user.passwordHash,
          user.fullName,
          user.enabled,
          user.locked,
          user.failedLoginAttempts,
        ]);

        for (const role of user.roles) {
          await tx.query(AUTH_QUERIES.ASSIGN_ROLE, [user.id, role]);
        }

        this.logger.log(`User created: ${user.id}`);
      } else {
        await tx.query(AUTH_QUERIES.UPDATE_USER, [
          user.id,
          user.locked,
          user.failedLoginAttempts,
          user.lastLoginAt,
        ]);

        this.logger.log(`User updated: ${user.id}`);
      }
    });

    return (await this.findById(user.id))!;
  }

  private toDomain(row: any): AuthUser {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      fullName: row.full_name,
      enabled: row.enabled,
      locked: row.locked,
      failedLoginAttempts: row.failed_login_attempts,
      lastLoginAt: row.last_login_at,
      roles: row.roles,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
