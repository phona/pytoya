import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway.module';

@Module({
  imports: [GatewayModule],
  exports: [GatewayModule],
})
export class WebSocketModule {}
