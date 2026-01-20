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
    // Use the same CORS origins as the HTTP API
    const allowedOrigins = this.configService.get<string[]>(
      'security.cors.allowedOrigins',
      ['http://localhost:3001'],
    );

    const cors = {
      origin: allowedOrigins,
      credentials: true,
    };

    return super.createIOServer(port, { ...options, cors });
  }
}
