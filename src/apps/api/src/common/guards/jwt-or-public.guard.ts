import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import * as path from 'path';
import { Repository } from 'typeorm';

import { ManifestEntity } from '../../entities/manifest.entity';
import { UserEntity, UserRole } from '../../entities/user.entity';
import { UsersService } from '../../users/users.service';
import { ERROR_CODES } from '../errors/error-codes';

interface JwtPayload {
  userId: number;
  role: string;
}

@Injectable()
export class JwtOrPublicGuard implements CanActivate {
  private readonly uploadsRoot = path.resolve(process.cwd(), 'uploads');

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    const payload = await this.verifyToken(token);
    const user = await this.usersService.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_INVALID_TOKEN,
        message: 'Invalid token',
      });
    }

    const storagePath = this.resolveStoragePath(request);
    const manifest = await this.manifestRepository.findOne({
      where: { storagePath },
      relations: ['group', 'group.project'],
    });

    if (!manifest) {
      throw new NotFoundException({
        code: ERROR_CODES.FILE_NOT_FOUND,
        message: 'File not found',
      });
    }

    if (user.role !== UserRole.ADMIN && manifest.group.project.ownerId !== user.id) {
      throw new ForbiddenException({
        code: ERROR_CODES.FILE_FORBIDDEN,
        message: 'Access denied',
      });
    }

    return true;
  }

  private extractToken(request: Request): string {
    const authHeader = request.headers.authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_MISSING_TOKEN,
        message: 'Authentication required',
      });
    }
    return authHeader.slice('Bearer '.length).trim();
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return (await this.jwtService.verifyAsync(token)) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_INVALID_TOKEN,
        message: 'Invalid token',
      });
    }
  }

  private resolveStoragePath(request: Request): string {
    const rawUrl = request.originalUrl ?? request.url;
    const pathWithoutQuery = rawUrl.split('?')[0];
    const relativePath = pathWithoutQuery.replace(/^\/uploads/, '');
    const safePath = path
      .normalize(decodeURIComponent(relativePath))
      .replace(/^(\.\.(\/|\\|$))+/, '');
    const resolvedPath = path.resolve(this.uploadsRoot, `.${safePath}`);

    if (!resolvedPath.startsWith(this.uploadsRoot)) {
      throw new NotFoundException({
        code: ERROR_CODES.FILE_NOT_FOUND,
        message: 'File not found',
      });
    }

    return resolvedPath;
  }
}
