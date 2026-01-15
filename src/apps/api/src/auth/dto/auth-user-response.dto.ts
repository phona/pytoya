import { UserEntity, UserRole } from '../../entities/user.entity';

export class AuthUserResponseDto {
  id!: number;
  username!: string;
  role!: UserRole;

  static fromEntity(user: UserEntity): AuthUserResponseDto {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}
