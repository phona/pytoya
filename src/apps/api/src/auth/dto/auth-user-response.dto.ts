import { UserEntity, UserRole } from '../../entities/user.entity';

export class AuthUserResponseDto {
  id!: number;
  email!: string;
  role!: UserRole;

  static fromEntity(user: UserEntity): AuthUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
