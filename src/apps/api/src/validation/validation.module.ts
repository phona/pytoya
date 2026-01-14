import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { ValidationScriptEntity } from '../entities/validation-script.entity';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { ScriptExecutorService } from './script-executor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ValidationScriptEntity,
      ManifestEntity,
      ProjectEntity,
    ]),
  ],
  controllers: [ValidationController],
  providers: [ValidationService, ScriptExecutorService],
  exports: [ValidationService],
})
export class ValidationModule {}
