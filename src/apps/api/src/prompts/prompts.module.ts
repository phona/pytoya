import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PromptEntity } from '../entities/prompt.entity';
import { PromptsController } from './prompts.controller';
import { PromptBuilderService } from './prompt-builder.service';
import { PromptsService } from './prompts.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PromptEntity])],
  controllers: [PromptsController],
  providers: [PromptsService, PromptBuilderService],
  exports: [PromptsService, PromptBuilderService],
})
export class PromptsModule {}
