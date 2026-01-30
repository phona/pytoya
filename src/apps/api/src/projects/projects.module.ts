import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectEntity } from '../entities/project.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { UsersModule } from '../users/users.module';
import { TextExtractorModule } from '../text-extractor/text-extractor.module';
import { ValidationModule } from '../validation/validation.module';
import { SchemasModule } from '../schemas/schemas.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ModelEntity,
      PromptEntity,
      ManifestEntity,
    ]),
    UsersModule,
    TextExtractorModule,
    ValidationModule,
    SchemasModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
