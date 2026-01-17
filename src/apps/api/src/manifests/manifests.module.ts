import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { GroupsModule } from '../groups/groups.module';
import { StorageModule } from '../storage/storage.module';
import { CsvExportService } from './csv-export.service';
import { ManifestsController } from './manifests.controller';
import { ManifestsService } from './manifests.service';
import {
  PdfFileInterceptor,
  PdfFilesInterceptor,
} from './interceptors/pdf-file.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManifestEntity, JobEntity]),
    GroupsModule,
    StorageModule,
  ],
  controllers: [ManifestsController],
  providers: [
    CsvExportService,
    ManifestsService,
    PdfFileInterceptor,
    PdfFilesInterceptor,
  ],
  exports: [ManifestsService, TypeOrmModule],
})
export class ManifestsModule {}
