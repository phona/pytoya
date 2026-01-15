import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

@Injectable()
export class WebSocketJwtGuard extends AuthGuard('jwt') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const authToken = this.extractToken(client);

    if (!authToken) {
      throw new UnauthorizedException('WebSocket authentication token missing');
    }

    const secret = this.configService.getOrThrow<string>('jwt.secret');

    try {
      const payload = await this.jwtService.verifyAsync(authToken, {
        secret,
      });
      // Attach user to socket data for use in handlers
      client.data.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid WebSocket authentication token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Try to get token from auth handshake
    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    // Try to get token from query string
    const token = client.handshake.query?.token;
    if (typeof token === 'string') {
      return token;
    }

    // Try to get token from headers
    const headers = client.handshake.headers;
    if (headers?.authorization) {
      const authHeader = headers.authorization as string;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }

    return undefined;
  }
}
