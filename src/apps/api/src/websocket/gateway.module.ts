import { Module } from '@nestjs/common';
import { ManifestGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { JwtService } from '@nestjs/jwt';
import { WebSocketJwtGuard } from './websocket-jwt.guard';

@Module({
  providers: [
    ManifestGateway,
    WebSocketService,
    JwtService,
    WebSocketJwtGuard,
  ],
  exports: [ManifestGateway, WebSocketService],
})
export class GatewayModule {}
