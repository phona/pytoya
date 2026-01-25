import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModelEntity } from '../entities/model.entity';
import { LlmModule } from '../llm/llm.module';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { ModelPricingService } from './model-pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModelEntity]), LlmModule],
  controllers: [ModelsController],
  providers: [ModelsService, ModelPricingService],
  exports: [ModelsService, ModelPricingService],
})
export class ModelsModule {}
