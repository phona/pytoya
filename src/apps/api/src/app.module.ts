import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ExtractionModule } from './extraction/extraction.module';
import { GroupsModule } from './groups/groups.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { ManifestsModule } from './manifests/manifests.module';
import { LlmModule } from './llm/llm.module';
import { OcrModule } from './ocr/ocr.module';
import { PdfToImageModule } from './pdf-to-image/pdf-to-image.module';
import { PromptsModule } from './prompts/prompts.module';
import { ProvidersModule } from './providers/providers.module';
import { ProjectsModule } from './projects/projects.module';
import { QueueModule } from './queue/queue.module';
import { SchemasModule } from './schemas/schemas.module';
import { StorageModule } from './storage/storage.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    DatabaseModule,
    ExtractionModule,
    GroupsModule,
    HealthModule,
    JobsModule,
    LlmModule,
    ManifestsModule,
    OcrModule,
    PdfToImageModule,
    PromptsModule,
    ProvidersModule,
    ProjectsModule,
    QueueModule,
    SchemasModule,
    StorageModule,
    WebSocketModule,
  ],
})
export class AppModule {}
