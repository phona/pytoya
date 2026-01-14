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
    const origin = this.configService.get<string>(
      'WEB_URL',
      'http://localhost:3000',
    );
    const cors = {
      origin,
      credentials: true,
    };

    return super.createIOServer(port, { ...options, cors });
  }
}
