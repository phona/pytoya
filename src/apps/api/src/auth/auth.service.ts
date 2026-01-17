import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
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
    const user = await this.usersService.findByUsername(loginDto.username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.resetFailuresIfStale(user);
    const lockoutMessage = this.getLockoutMessage(user);
    if (lockoutMessage) {
      await this.usersService.save(user);
      throw new UnauthorizedException(lockoutMessage);
    }

    const passwordMatches = await this.comparePassword(
      loginDto.password,
      user.password,
    );
    if (!passwordMatches) {
      await this.recordFailedAttempt(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.resetLoginAttempts(user);

    const payload = { userId: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return AuthResponseDto.fromToken(this.toUserResponse(user), accessToken);
  }

  async unlockUser(userId: number): Promise<AuthUserResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastFailedLoginAt = null;
    await this.usersService.save(user);

    return this.toUserResponse(user);
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

  private resetFailuresIfStale(user: UserEntity): void {
    if (!user.lastFailedLoginAt) {
      return;
    }
    const elapsedMs = Date.now() - user.lastFailedLoginAt.getTime();
    if (elapsedMs > 24 * 60 * 60 * 1000) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }
  }

  private getLockoutMessage(user: UserEntity): string | null {
    const lockout = this.getAccountLockoutConfig();
    if (!lockout.enabled) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return `Account locked until ${user.lockedUntil.toISOString()}`;
    }

    const permanent = lockout.thresholds.find(
      (threshold) =>
        threshold.permanent &&
        user.failedLoginAttempts >= threshold.attempts,
    );
    if (permanent) {
      return 'Account locked. Contact an administrator.';
    }

    return null;
  }

  private async recordFailedAttempt(user: UserEntity): Promise<void> {
    const lockout = this.getAccountLockoutConfig();
    if (!lockout.enabled) {
      return;
    }

    user.failedLoginAttempts += 1;
    user.lastFailedLoginAt = new Date();

    const threshold = [...lockout.thresholds]
      .sort((a, b) => b.attempts - a.attempts)
      .find((rule) => user.failedLoginAttempts >= rule.attempts);

    if (threshold?.permanent) {
      user.lockedUntil = null;
    } else if (threshold?.duration) {
      user.lockedUntil = new Date(Date.now() + threshold.duration);
    }

    await this.usersService.save(user);
  }

  private async resetLoginAttempts(user: UserEntity): Promise<void> {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.usersService.save(user);
  }

  private getAccountLockoutConfig(): {
    enabled: boolean;
    thresholds: Array<{
      attempts: number;
      duration?: number;
      permanent?: boolean;
    }>;
  } {
    const config =
      this.configService.get<
        | {
            enabled?: boolean;
            thresholds?: Array<{
              attempts: number;
              duration?: number;
              permanent?: boolean;
            }>;
          }
        | undefined
      >('security.accountLockout');

    return {
      enabled: config?.enabled ?? true,
      thresholds:
        config?.thresholds ?? [
          { attempts: 5, duration: 15 * 60 * 1000 },
          { attempts: 10, duration: 60 * 60 * 1000 },
          { attempts: 15, permanent: true },
        ],
    };
  }
}
