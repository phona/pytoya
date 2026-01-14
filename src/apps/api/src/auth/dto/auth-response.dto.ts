import { AuthUserResponseDto } from './auth-user-response.dto';

export class AuthResponseDto {
  user!: AuthUserResponseDto;
  token!: string;
  access_token!: string;

  static fromToken(
    user: AuthUserResponseDto,
    token: string,
  ): AuthResponseDto {
    return {
      user,
      token,
      access_token: token,
    };
  }
}
