import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestsModule } from '../manifests/manifests.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { EXTRACTION_QUEUE } from './queue.constants';
import { QueueController } from './queue.controller';
import { ExtractionQueueEventsListener } from './extraction-queue-events.listener';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost =
          configService.get<string>('redis.host') ?? 'localhost';
        const redisPort =
          configService.get<number>('redis.port') ?? 6379;

        return {
          connection: {
            host: redisHost,
            port: redisPort,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: EXTRACTION_QUEUE,
    }),
    TypeOrmModule.forFeature([JobEntity]),
    ManifestsModule,
    WebSocketModule,
  ],
  controllers: [QueueController],
  providers: [QueueService, ExtractionQueueEventsListener],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
