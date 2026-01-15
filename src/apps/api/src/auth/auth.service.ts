import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { UserEntity, UserRole } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthUserResponseDto } from './dto/auth-user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<UserEntity | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }

    const passwordMatches = await this.comparePassword(password, user.password);
    return passwordMatches ? user : null;
  }

  async register(registerDto: RegisterDto): Promise<AuthUserResponseDto> {
    const existingUser = await this.usersService.findByUsername(registerDto.username);
    if (existingUser) {
      throw new ConflictException('Username already registered');
    }

    const passwordHash = await this.hashPassword(registerDto.password);
    const user = await this.usersService.create({
      username: registerDto.username,
      password: passwordHash,
      role: UserRole.USER,
    });

    return this.toUserResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { userId: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return AuthResponseDto.fromToken(this.toUserResponse(user), accessToken);
  }

  private async hashPassword(password: string): Promise<string> {
    return UserEntity.hashPassword(password);
  }

  private async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private toUserResponse(user: UserEntity): AuthUserResponseDto {
    return AuthUserResponseDto.fromEntity(user);
  }
}
