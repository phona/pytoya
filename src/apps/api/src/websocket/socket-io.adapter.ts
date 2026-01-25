import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const normalizeBasePath = (value: string | undefined): string => {
      const trimmed = (value ?? '').trim();
      if (!trimmed || trimmed === '/') {
        return '';
      }
      const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
    };

    const joinPath = (basePath: string, suffix: string): string => {
      const base = normalizeBasePath(basePath);
      if (!base) {
        return suffix.startsWith('/') ? suffix : `/${suffix}`;
      }
      const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
      return `${base}${normalizedSuffix}`;
    };

    // Use the same CORS origins as the HTTP API
    const allowedOrigins = this.configService.get<string[]>(
      'security.cors.allowedOrigins',
      ['http://localhost:3001'],
    );

    const cors = {
      origin: allowedOrigins,
      credentials: true,
    };

    const basePath = normalizeBasePath(this.configService.get<string>('server.basePath'));
    const path = joinPath(basePath, '/api/socket.io');

    return super.createIOServer(port, { ...options, cors, path });
  }
}
