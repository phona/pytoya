import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { ProjectEntity } from '../entities/project.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { ValidationScriptEntity } from '../entities/validation-script.entity';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { ScriptExecutorService } from './script-executor.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ValidationScriptEntity,
      ManifestEntity,
      ProjectEntity,
      SchemaEntity,
      ModelEntity,
    ]),
    LlmModule,
  ],
  controllers: [ValidationController],
  providers: [ValidationService, ScriptExecutorService],
  exports: [ValidationService],
})
export class ValidationModule {}
