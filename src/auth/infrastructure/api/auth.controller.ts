import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthServicePort } from '../../domain/ports/in/auth-service.port';
import { Public } from '../../../shared/decorators/public.decorator';
import { AuthResponseDto } from '../../application/dto/auth-response.dto';
import { RegisterRequestDto } from '../../application/dto/register-request.dto';
import { LoginRequestDto } from '../../application/dto/login-request.dto';
import { RefreshTokenRequestDto } from '../../application/dto/refresh-token-request.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authApplicationService: AuthServicePort) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email registered' })
  register(@Body() dto: RegisterRequestDto): Promise<AuthResponseDto> {
    return this.authApplicationService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Login reject' })
  login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authApplicationService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenRequestDto): Promise<AuthResponseDto> {
    return this.authApplicationService.refresh(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoked refresh token' })
  logout(@Body() dto: RefreshTokenRequestDto): Promise<void> {
    return this.authApplicationService.logout(dto.refreshToken);
  }
}
