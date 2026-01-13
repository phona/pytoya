import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestsModule } from '../manifests/manifests.module';
import { EXTRACTION_QUEUE } from './queue.constants';
import { QueueController } from './queue.controller';
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
          configService.get<string>('REDIS_HOST') ?? 'localhost';
        const portValue = configService.get<string>('REDIS_PORT');
        const redisPort = portValue ? Number(portValue) : 6379;

        return {
          connection: {
            host: redisHost,
            port: Number.isNaN(redisPort) ? 6379 : redisPort,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: EXTRACTION_QUEUE,
    }),
    TypeOrmModule.forFeature([JobEntity]),
    ManifestsModule,
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
