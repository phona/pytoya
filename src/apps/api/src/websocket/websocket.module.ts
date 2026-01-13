import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway.module';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [GatewayModule],
  exports: [GatewayModule, WebSocketService],
})
export class WebSocketModule {}
