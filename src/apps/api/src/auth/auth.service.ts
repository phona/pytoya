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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const passwordMatches = await this.comparePassword(password, user.password);
    return passwordMatches ? user : null;
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(registerDto.password);
    const user = await this.usersService.create({
      email: registerDto.email,
      password: passwordHash,
      role: UserRole.USER,
    });

    return this.sanitizeUser(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { userId: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: this.sanitizeUser(user),
    };
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

  private sanitizeUser(user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
