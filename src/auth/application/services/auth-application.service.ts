import { Injectable, Logger } from '@nestjs/common';
import { AuthServicePort } from '../../domain/ports/in/auth-service.port';
import { AuthUserRepositoryPort } from '../../domain/ports/out/auth-user-repository.port';
import { RefreshTokenRepositoryPort } from '../../domain/ports/out/refresh-token-repository.port';
import { PasswordEncoderPort } from '../../domain/ports/out/password-encoder.port';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterRequestDto } from '../dto/register-request.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { EmailAlreadyExistsException } from '../../domain/exceptions/email-already-exists.exception';
import { AuthUser } from '../../domain/model/auth-user.model';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '../../../shared/util/hash.util';
import { LoginRequestDto } from '../dto/login-request.dto';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { RefreshTokenRequestDto } from '../dto/refresh-token-request.dto';
import { TokenExpiredException } from '../../domain/exceptions/token-expired.exception';

@Injectable()
export class AuthApplicationService extends AuthServicePort {
  private readonly logger = new Logger(AuthApplicationService.name);

  constructor(
    private readonly userRepo: AuthUserRepositoryPort,
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    private readonly passwordEncoder: PasswordEncoderPort,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async register(dto: RegisterRequestDto): Promise<AuthResponseDto> {
    if (await this.userRepo.existsByEmail(dto.email))
      throw new EmailAlreadyExistsException();

    const hashedPassword = await this.passwordEncoder.encode(dto.password);

    const user: AuthUser = {
      ...dto,
      id: uuidv4(),
      passwordHash: hashedPassword,
      enabled: true,
      locked: false,
      failedLoginAttempts: 0,
      lastLoginAt: null,
      roles: ['ROLE_USER'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.userRepo.save(user);
    this.logger.log(`User registered: ${user.id}`);
    return this.buildAuthResponse(saved);
  }

  async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new InvalidCredentialsException();
    if (user.locked) throw new InvalidCredentialsException('Account Locked');

    const valid = await this.passwordEncoder.matches(
      dto.password,
      user.passwordHash,
    );

    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const updated: AuthUser = {
        ...user,
        failedLoginAttempts: attempts,
        locked: attempts >= 5,
        updatedAt: new Date(),
      };
      await this.userRepo.save(updated);

      if (attempts >= 5) {
        this.logger.warn(`Account locked: ${user.id}`);
      }

      throw new InvalidCredentialsException();
    }

    const updated: AuthUser = {
      ...user,
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };
    await this.userRepo.save(updated);
    this.logger.log(`Login successfully: ${user.id}`);

    return this.buildAuthResponse(updated);
  }

  async refresh(dto: RefreshTokenRequestDto): Promise<AuthResponseDto> {
    const stored = await this.refreshTokenRepo.findByTokenHash(
      sha256(dto.refreshToken),
    );
    if (!stored) throw new InvalidCredentialsException('Refresh token invalid');
    if (stored.revoked) {
      await this.refreshTokenRepo.revokeAllByUserId(stored.userId);
      this.logger.warn(
        `Revoked token reuse. All revoked for: ${stored.userId}`,
      );

      throw new InvalidCredentialsException('Refresh token invalid');
    }

    if (new Date() > stored.expiresAt) throw new TokenExpiredException();
    await this.refreshTokenRepo.save({
      ...stored,
      revoked: true,
      expiresAt: new Date(),
    });

    const user = await this.userRepo.findById(stored.userId);
    if (!user)
      throw new InvalidCredentialsException(`User not found: ${stored.userId}`);

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokenRepo.findByTokenHash(
      sha256(refreshToken),
    );
    if (stored)
      await this.refreshTokenRepo.save({
        ...stored,
        revoked: true,
        revokedAt: new Date(),
      });
  }

  private async buildAuthResponse(user: AuthUser): Promise<AuthResponseDto> {
    const payload = { sub: user.id, roles: user.roles };
    const accessToken = this.jwtService.sign(payload);
    const rawRefreshToken = uuidv4();

    const refreshDays = Number(
      this.configService.get('JWT_REFRESH_EXPIRATION_DAYS') || 30,
    );

    await this.refreshTokenRepo.save({
      id: uuidv4(),
      userId: user.id,
      tokenHash: sha256(rawRefreshToken),
      expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      revoked: false,
      revokedAt: null,
      createdAt: new Date(),
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
      },
    };
  }
}
