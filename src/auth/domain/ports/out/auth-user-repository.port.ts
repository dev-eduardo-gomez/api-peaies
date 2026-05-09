import { AuthUser } from '../../model/auth-user.model';

export abstract class AuthUserRepositoryPort {
  abstract findByEmail(emial: string): Promise<AuthUser | null>;
  abstract findById(id: string): Promise<AuthUser | null>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract save(user: AuthUser): Promise<AuthUser>;
}
