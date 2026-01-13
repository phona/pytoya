import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PromptEntity } from '../entities/prompt.entity';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PromptEntity])],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
