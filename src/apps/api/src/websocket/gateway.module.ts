import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { ManifestGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { WebSocketJwtGuard } from './websocket-jwt.guard';
import { ProgressPublisherService } from './progress-publisher.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiration', '7d') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [
    ManifestGateway,
    WebSocketService,
    ProgressPublisherService,
    WebSocketJwtGuard,
  ],
  exports: [ManifestGateway, WebSocketService, ProgressPublisherService],
})
export class GatewayModule {}
