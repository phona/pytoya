import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExtractorEntity } from '../entities/extractor.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { TextExtractorModule } from '../text-extractor/text-extractor.module';
import { ExtractorCostService } from './extractor-cost.service';
import { ExtractorsController } from './extractors.controller';
import { ExtractorsService } from './extractors.service';

@Module({
  imports: [
    TextExtractorModule,
    TypeOrmModule.forFeature([ExtractorEntity, ManifestEntity, ProjectEntity]),
  ],
  controllers: [ExtractorsController],
  providers: [ExtractorsService, ExtractorCostService],
  exports: [ExtractorsService],
})
export class ExtractorsModule {}
