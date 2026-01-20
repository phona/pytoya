import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { GroupsModule } from '../groups/groups.module';
import { ModelsModule } from '../models/models.module';
import { OcrModule } from '../ocr/ocr.module';
import { StorageModule } from '../storage/storage.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { CsvExportService } from './csv-export.service';
import { CostEstimateService } from './cost-estimate.service';
import { ManifestsController } from './manifests.controller';
import { ManifestsService } from './manifests.service';
import {
  PdfFileInterceptor,
  PdfFilesInterceptor,
} from './interceptors/pdf-file.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManifestEntity, JobEntity, ModelEntity]),
    GroupsModule,
    ModelsModule,
    OcrModule,
    StorageModule,
    WebSocketModule,
  ],
  controllers: [ManifestsController],
  providers: [
    CsvExportService,
    CostEstimateService,
    ManifestsService,
    PdfFileInterceptor,
    PdfFilesInterceptor,
  ],
  exports: [ManifestsService, TypeOrmModule],
})
export class ManifestsModule {}
