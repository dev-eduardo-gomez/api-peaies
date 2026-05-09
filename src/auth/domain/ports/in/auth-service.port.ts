import { AuthResponseDto } from '../../../application/dto/auth-response.dto';
import { LoginRequestDto } from '../../../application/dto/login-request.dto';
import { RefreshTokenRequestDto } from '../../../application/dto/refresh-token-request.dto';
import { RegisterRequestDto } from '../../../application/dto/register-request.dto';

export abstract class AuthServicePort {
  abstract register(dto: RegisterRequestDto): Promise<AuthResponseDto>;
  abstract login(dto: LoginRequestDto): Promise<AuthResponseDto>;
  abstract refresh(dto: RefreshTokenRequestDto): Promise<AuthResponseDto>;
  abstract logout(refreshToken: string): Promise<void>;
}
