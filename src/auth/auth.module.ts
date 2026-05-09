import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './infrastructure/api/auth.controller';
import { JwtStrategy } from './infrastructure/config/jwt.strategy';
import { AuthServicePort } from './domain/ports/in/auth-service.port';
import { AuthApplicationService } from './application/services/auth-application.service';
import { AuthUserRepositoryPort } from './domain/ports/out/auth-user-repository.port';
import { AuthUserRepositoryAdapter } from './infrastructure/adapters/auth-user-repository.adapter';
import { RefreshTokenRepositoryPort } from './domain/ports/out/refresh-token-repository.port';
import { RefreshTokenRepositoryAdapter } from './infrastructure/adapters/refresh-token-repository.adapter';
import { PasswordEncoderPort } from './domain/ports/out/password-encoder.port';
import { BcryptPasswordEncoderAdapter } from './infrastructure/adapters/bcrypt-password-encoder.adapter';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRATION', '1h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: AuthServicePort,
      useClass: AuthApplicationService,
    },
    {
      provide: AuthUserRepositoryPort,
      useClass: AuthUserRepositoryAdapter,
    },
    {
      provide: RefreshTokenRepositoryPort,
      useClass: RefreshTokenRepositoryAdapter,
    },
    {
      provide: PasswordEncoderPort,
      useClass: BcryptPasswordEncoderAdapter,
    },
  ],
  exports: [AuthServicePort, JwtModule, PassportModule],
})
export class AuthModule {}
