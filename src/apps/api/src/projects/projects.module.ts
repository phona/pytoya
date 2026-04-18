import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectEntity } from '../entities/project.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { OperationLogEntity } from '../entities/operation-log.entity';
import { UsersModule } from '../users/users.module';
import { TextExtractorModule } from '../text-extractor/text-extractor.module';
import { ValidationModule } from '../validation/validation.module';
import { SchemasModule } from '../schemas/schemas.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AnalyticsRecommendationsService } from './analytics-recommendations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ModelEntity,
      PromptEntity,
      ManifestEntity,
      OperationLogEntity,
    ]),
    UsersModule,
    TextExtractorModule,
    ValidationModule,
    SchemasModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, AnalyticsRecommendationsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
