import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { LlmModule } from '../llm/llm.module';
import { OcrModule } from '../ocr/ocr.module';
import { PdfToImageModule } from '../pdf-to-image/pdf-to-image.module';
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
      ModelEntity,
      PromptEntity,
      SchemaEntity,
    ]),
    LlmModule,
    OcrModule,
    PdfToImageModule,
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
