import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportScriptEntity } from '../entities/export-script.entity';
import { ProjectEntity } from '../entities/project.entity';
import { ExportScriptExecutorService } from './export-script-executor.service';
import { ExportScriptsController } from './export-scripts.controller';
import { ExportScriptsService } from './export-scripts.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExportScriptEntity, ProjectEntity])],
  controllers: [ExportScriptsController],
  providers: [ExportScriptsService, ExportScriptExecutorService],
  exports: [ExportScriptsService, ExportScriptExecutorService],
})
export class ExportScriptsModule {}

