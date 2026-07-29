import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PromptEntity } from '../entities/prompt.entity';
import { TextExtractorModule } from '../text-extractor/text-extractor.module';
import { PromptsController } from './prompts.controller';
import { PromptBuilderService } from './prompt-builder.service';
import { PromptsService } from './prompts.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PromptEntity]), TextExtractorModule],
  controllers: [PromptsController],
  providers: [PromptsService, PromptBuilderService],
  exports: [PromptsService, PromptBuilderService],
})
export class PromptsModule {}
