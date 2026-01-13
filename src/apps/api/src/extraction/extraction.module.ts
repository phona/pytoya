import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { ProviderEntity } from '../entities/provider.entity';
import { LlmModule } from '../llm/llm.module';
import { OcrModule } from '../ocr/ocr.module';
import { ManifestsModule } from '../manifests/manifests.module';
import { PromptsModule } from '../prompts/prompts.module';
import { ExtractionController } from './extraction.controller';
import { ExtractionService } from './extraction.service';
import { ManifestExtractionProcessor } from './processors/manifest-extraction.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ManifestEntity,
      ProviderEntity,
      PromptEntity,
    ]),
    LlmModule,
    OcrModule,
    PromptsModule,
    ManifestsModule,
  ],
  controllers: [ExtractionController],
  providers: [ExtractionService, ManifestExtractionProcessor],
  exports: [ExtractionService],
})
export class ExtractionModule {}
