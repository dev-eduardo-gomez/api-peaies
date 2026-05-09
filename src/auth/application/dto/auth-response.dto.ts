import { ApiProperty } from '@nestjs/swagger';

export class UserInfoDto {
  @ApiProperty({ example: '7a1b8f3c-9d2e-4f1a-b5c7-8e9f0a1b2c3d' })
  id: string;

  @ApiProperty({ example: 'eduardo@example.com' })
  email: string;

  @ApiProperty({ example: 'Eduardo Ramírez' })
  fullName: string;

  @ApiProperty({ example: ['ROLE_USER'] })
  roles: string[];
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'a8f2e1d9-3b7c-4e5a-9f2b-1c3d4e5f6a7b' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 3600 })
  expiresInSeconds: number;

  @ApiProperty({ type: UserInfoDto })
  user: UserInfoDto;
}
