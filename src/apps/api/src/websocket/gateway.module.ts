import { Module } from '@nestjs/common';
import { ManifestGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  providers: [ManifestGateway, WebSocketService, JwtService],
  exports: [ManifestGateway, WebSocketService],
})
export class GatewayModule {}
