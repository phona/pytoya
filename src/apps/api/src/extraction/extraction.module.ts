import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { ExtractorEntity } from '../entities/extractor.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { LlmModule } from '../llm/llm.module';
import { ModelsModule } from '../models/models.module';
import { TextExtractorModule } from '../text-extractor/text-extractor.module';
import { ManifestsModule } from '../manifests/manifests.module';
import { PromptsModule } from '../prompts/prompts.module';
import { SchemasModule } from '../schemas/schemas.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { ExtractionController } from './extraction.controller';
import { ExtractionService } from './extraction.service';
import { ManifestExtractionProcessor } from './processors/manifest-extraction.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ManifestEntity,
      ExtractorEntity,
      ModelEntity,
      PromptEntity,
      SchemaEntity,
    ]),
    LlmModule,
    ModelsModule,
    TextExtractorModule,
    PromptsModule,
    SchemasModule,
    ManifestsModule,
    WebSocketModule,
  ],
  controllers: [ExtractionController],
  providers: [ExtractionService, ManifestExtractionProcessor],
  exports: [ExtractionService],
})
export class ExtractionModule {}
