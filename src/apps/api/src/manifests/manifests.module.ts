import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ManifestItemEntity } from '../entities/manifest-item.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { ExtractorEntity } from '../entities/extractor.entity';
import { GroupsModule } from '../groups/groups.module';
import { ModelsModule } from '../models/models.module';
import { TextExtractorModule } from '../text-extractor/text-extractor.module';
import { StorageModule } from '../storage/storage.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { JOB_QUEUE_PORT } from '../ports/job-queue.port';
import { QueueServiceJobQueueAdapter } from '../ports/queue-service-job-queue.adapter';
import { BulkManifestsUseCase } from '../usecases/bulk-manifests.usecase';
import { ExtractManifestsUseCase } from '../usecases/extract-manifests.usecase';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';
import { UploadManifestsUseCase } from '../usecases/upload-manifests.usecase';
import { CsvExportService } from './csv-export.service';
import { ManifestsController } from './manifests.controller';
import { ManifestsService } from './manifests.service';
import {
  PdfFileInterceptor,
  PdfFilesInterceptor,
} from './interceptors/pdf-file.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ManifestEntity,
      ManifestItemEntity,
      JobEntity,
      ModelEntity,
      PromptEntity,
      ExtractorEntity,
    ]),
    GroupsModule,
    ModelsModule,
    TextExtractorModule,
    StorageModule,
    WebSocketModule,
  ],
  controllers: [ManifestsController],
  providers: [
    CsvExportService,
    ManifestsService,
    PdfFileInterceptor,
    PdfFilesInterceptor,
    QueueServiceJobQueueAdapter,
    { provide: JOB_QUEUE_PORT, useExisting: QueueServiceJobQueueAdapter },
    UploadManifestsUseCase,
    ExtractManifestsUseCase,
    BulkManifestsUseCase,
    UpdateManifestUseCase,
  ],
  exports: [ManifestsService, TypeOrmModule],
})
export class ManifestsModule {}
