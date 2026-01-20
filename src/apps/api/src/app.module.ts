import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { JwtOrPublicGuard } from './common/guards/jwt-or-public.guard';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { ExtractionModule } from './extraction/extraction.module';
import { GroupsModule } from './groups/groups.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { ManifestsModule } from './manifests/manifests.module';
import { LlmModule } from './llm/llm.module';
import { PdfToImageModule } from './pdf-to-image/pdf-to-image.module';
import { PromptsModule } from './prompts/prompts.module';
import { ModelsModule } from './models/models.module';
import { ProjectsModule } from './projects/projects.module';
import { TextExtractorModule } from './text-extractor/text-extractor.module';
import { ExtractorsModule } from './extractors/extractors.module';
import { QueueModule } from './queue/queue.module';
import { SchemasModule } from './schemas/schemas.module';
import { StorageModule } from './storage/storage.module';
import { ValidationModule } from './validation/validation.module';
import { WebSocketModule } from './websocket/websocket.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rateLimit = configService.get<{
          enabled?: boolean;
          ttl?: number;
          limit?: number;
          storage?: string;
        }>('security.rateLimit');
        const enabled = rateLimit?.enabled ?? true;
        const ttl = rateLimit?.ttl ?? 60000;
        const limit = rateLimit?.limit ?? 10;
        const storageType = rateLimit?.storage ?? 'memory';

        const storage =
          storageType === 'redis'
            ? new RedisThrottlerStorage({
                host: configService.get<string>('redis.host') ?? 'localhost',
                port: configService.get<number>('redis.port') ?? 6379,
              })
            : undefined;

        return {
          throttlers: [
            {
              name: 'default',
              ttl,
              limit,
              skipIf: () => !enabled,
            },
          ],
          storage,
        };
      },
    }),
    AuthModule,
    DatabaseModule,
    UsersModule,
    ExtractionModule,
    GroupsModule,
    HealthModule,
    JobsModule,
    LlmModule,
    ManifestsModule,
    MetricsModule,
    PdfToImageModule,
    PromptsModule,
    ModelsModule,
    ProjectsModule,
    TextExtractorModule,
    ExtractorsModule,
    QueueModule,
    SchemasModule,
    StorageModule,
    ValidationModule,
    WebSocketModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    JwtOrPublicGuard,
  ],
})
export class AppModule {}
