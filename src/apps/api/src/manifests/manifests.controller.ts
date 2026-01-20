import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Redirect,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ManifestStatus } from '../entities/manifest.entity';
import { UserRole } from '../entities/user.entity';
import { UserEntity } from '../entities/user.entity';
import { StorageService } from '../storage/storage.service';
import { FileNotFoundException } from '../storage/exceptions/file-not-found.exception';
import { CsvExportService } from './csv-export.service';
import { CostEstimateService } from './cost-estimate.service';
import { BulkExtractDto } from './dto/bulk-extract.dto';
import { ExportBulkDto } from './dto/export-bulk.dto';
import { ExtractDto } from './dto/extract.dto';
import { ExportManifestsDto } from './dto/export-manifests.dto';
import { ManifestResponseDto } from './dto/manifest-response.dto';
import { OcrResultResponseDto } from './dto/ocr-result.dto';
import { ReExtractFieldPreviewDto, ReExtractFieldPreviewResponseDto } from './dto/re-extract-field-preview.dto';
import { ReExtractFieldDto } from './dto/re-extract-field.dto';
import { TriggerOcrDto } from './dto/trigger-ocr.dto';
import { UpdateManifestDto } from './dto/update-manifest.dto';
import { DynamicFieldFiltersDto } from './dto/dynamic-field-filters.dto';
import { ManifestsService } from './manifests.service';
import { QueueService } from '../queue/queue.service';
import {
  PdfFileInterceptor,
  PdfFilesInterceptor,
} from './interceptors/pdf-file.interceptor';

@UseGuards(JwtAuthGuard)
@Controller()
export class ManifestsController {
  constructor(
    private readonly csvExportService: CsvExportService,
    private readonly manifestsService: ManifestsService,
    private readonly costEstimateService: CostEstimateService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  @Post('groups/:groupId/manifests/upload')
  @UseInterceptors(PdfFileInterceptor)
  async uploadSingle(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const manifest = await this.manifestsService.create(user, groupId, file);
    await this.autoExtractIfEnabled(user, manifest.id);
    return ManifestResponseDto.fromEntity(manifest);
  }

  @Post('groups/:groupId/manifests/batch')
  @UseInterceptors(PdfFilesInterceptor)
  async uploadBatch(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    if (!files || files.length === 0) {
      throw new FileNotFoundException();
    }

    const manifests = await Promise.all(
      files.map((file) => this.manifestsService.create(user, groupId, file)),
    );
    await this.autoExtractBatchIfEnabled(user, manifests.map((manifest) => manifest.id));
    return manifests.map((m) => ManifestResponseDto.fromEntity(m));
  }

  // Alias for uploadSingle - canonical path expected by web app
  @Post('groups/:groupId/manifests')
  @UseInterceptors(PdfFileInterceptor)
  async upload(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const manifest = await this.manifestsService.create(user, groupId, file);
    await this.autoExtractIfEnabled(user, manifest.id);
    return ManifestResponseDto.fromEntity(manifest);
  }

  @Get('groups/:groupId/manifests')
  async findByGroup(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() query: DynamicFieldFiltersDto,
  ) {
    const result = await this.manifestsService.findByGroup(
      user,
      groupId,
      query,
    );

    const data = result.data.map((m) => ManifestResponseDto.fromEntity(m));
    const hasFilters =
      query.page !== undefined ||
      query.pageSize !== undefined ||
      query.sortBy ||
      query.order ||
      (query.filter && Object.keys(query.filter).length > 0) ||
      query.status ||
      query.poNo ||
      query.department ||
      query.dateFrom ||
      query.dateTo ||
      query.humanVerified !== undefined ||
      query.confidenceMin !== undefined ||
      query.confidenceMax !== undefined ||
      query.ocrQualityMin !== undefined ||
      query.ocrQualityMax !== undefined ||
      query.extractionStatus !== undefined ||
      query.costMin !== undefined ||
      query.costMax !== undefined ||
      query.textExtractorId ||
      query.extractorType;

    if (hasFilters) {
      return {
        data,
        meta: result.meta,
      };
    }

    return data;
  }

  @Get('manifests/:id/ocr')
  async getOcrResult(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OcrResultResponseDto> {
    const manifest = await this.manifestsService.findOne(user, id);
    const ocrResult =
      (manifest.ocrResult as OcrResultResponseDto['ocrResult']) ?? null;

    return {
      manifestId: manifest.id,
      ocrResult,
      hasOcr: Boolean(ocrResult),
      ocrProcessedAt: manifest.ocrProcessedAt ?? null,
      qualityScore: manifest.ocrQualityScore ?? null,
    };
  }

  @Post('manifests/:id/ocr')
  async triggerOcr(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Query('force') force?: string,
    @Body() body?: TriggerOcrDto,
  ): Promise<OcrResultResponseDto> {
    const manifest = await this.manifestsService.findOne(user, id);
    const shouldForce = this.parseOptionalBoolean(force) === true;
    const result = await this.manifestsService.processOcrForManifest(
      manifest,
      { force: shouldForce, textExtractorId: body?.textExtractorId },
    );

    return {
      manifestId: manifest.id,
      ocrResult: result,
      hasOcr: true,
      ocrProcessedAt: manifest.ocrProcessedAt ?? null,
      qualityScore: manifest.ocrQualityScore ?? null,
    };
  }

  @Post('manifests/ocr/backfill')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async backfillOcr(
    @Query('limit') limit?: string,
    @Query('concurrency') concurrency?: string,
  ) {
    const result = await this.manifestsService.backfillOcrResults({
      limit: this.parseOptionalNumber(limit) ?? undefined,
      concurrency: this.parseOptionalNumber(concurrency) ?? undefined,
    });

    return {
      started: true,
      processed: result.processed,
      skipped: result.skipped,
    };
  }

  @Get('manifests/export/csv')
  async exportCsv(
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) response: Response,
    @Query('status') status?: string,
    @Query('groupId') groupId?: string,
    @Query('projectId') projectId?: string,
    @Query('poNo') poNo?: string,
    @Query('department') department?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('humanVerified') humanVerified?: string,
    @Query('confidenceMin') confidenceMin?: string,
    @Query('confidenceMax') confidenceMax?: string,
  ) {
    const filters = {
      status: this.parseOptionalStatus(status),
      groupId: this.parseOptionalNumber(groupId) ?? undefined,
      projectId: this.parseOptionalNumber(projectId) ?? undefined,
      poNo: poNo || undefined,
      department: department || undefined,
      dateFrom: this.parseOptionalDate(dateFrom),
      dateTo: this.parseOptionalDate(dateTo),
      humanVerified: this.parseOptionalBoolean(humanVerified),
      confidenceMin:
        this.parseOptionalNumber(confidenceMin) ?? undefined,
      confidenceMax:
        this.parseOptionalNumber(confidenceMax) ?? undefined,
    };

    const { filename, csv } = await this.csvExportService.exportCsv(
      user,
      filters,
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return csv;
  }

  @Post('manifests/export-bulk')
  async exportBulk(
    @CurrentUser() user: UserEntity,
    @Body() body: ExportBulkDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { filename, csv } =
      await this.csvExportService.exportCsvByManifestIds(
        user,
        body.manifestIds,
      );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return csv;
  }

  // POST export for selected manifests (canonical path)
  @Post('manifests/export/csv')
  async exportManifests(
    @CurrentUser() user: UserEntity,
    @Body() body: ExportManifestsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { filename, csv } =
      await this.csvExportService.exportCsvByManifestIds(
        user,
        body.manifestIds.map(String),
      );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return csv;
  }

  @Post('manifests/:id/extract')
  async extract(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ExtractDto,
  ) {
    const manifest = await this.manifestsService.findOne(user, id);
    if (!manifest.ocrResult) {
      await this.manifestsService.processOcrForManifest(manifest);
    }

    const estimate = await this.costEstimateService.estimateCost({
      manifests: [manifest],
      llmModelId: body.llmModelId,
    });

    const jobId = await this.queueService.addExtractionJob(
      id,
      body.llmModelId,
      body.promptId,
      undefined,
      undefined,
      undefined,
      estimate.estimatedCostMax,
    );

    return {
      jobId,
      estimatedCost: {
        min: estimate.estimatedCostMin,
        max: estimate.estimatedCostMax,
      },
      currency: estimate.currency,
    };
  }

  @Post('manifests/extract-bulk')
  async extractBulk(
    @CurrentUser() user: UserEntity,
    @Body() body: BulkExtractDto,
  ) {
    const manifests = await this.manifestsService.findManyByIds(
      user,
      body.manifestIds,
    );

    for (const manifest of manifests) {
      if (!manifest.ocrResult) {
        await this.manifestsService.processOcrForManifest(manifest);
      }
    }

    const estimate = await this.costEstimateService.estimateCost({
      manifests,
      llmModelId: body.llmModelId,
      textExtractorId: body.textExtractorId,
    });

    if (body.dryRun) {
      return {
        manifestCount: manifests.length,
        estimatedCost: {
          min: estimate.estimatedCostMin,
          max: estimate.estimatedCostMax,
        },
        currency: estimate.currency,
      };
    }

    const perManifestEstimate = manifests.length
      ? estimate.estimatedCostMax / manifests.length
      : 0;
    const jobIds = await Promise.all(
      manifests.map((manifest) =>
        this.queueService.addExtractionJob(
          manifest.id,
          body.llmModelId,
          body.promptId,
          undefined,
          undefined,
          undefined,
          perManifestEstimate,
        ),
      ),
    );
    const batchId = `batch_${Date.now()}_${jobIds.length}`;

    return {
      jobId: batchId,
      jobIds,
      manifestCount: manifests.length,
      estimatedCost: {
        min: estimate.estimatedCostMin,
        max: estimate.estimatedCostMax,
      },
      currency: estimate.currency,
    };
  }

  @Get('manifests/cost-estimate')
  async getCostEstimate(
    @CurrentUser() user: UserEntity,
    @Query('manifestIds') manifestIds?: string,
    @Query('llmModelId') llmModelId?: string,
    @Query('textExtractorId') textExtractorId?: string,
  ) {
    const parsedIds = this.parseManifestIds(manifestIds);
    const manifests = await this.manifestsService.findManyByIds(
      user,
      parsedIds,
    );
    return this.costEstimateService.estimateCost({
      manifests,
      llmModelId,
      textExtractorId,
    });
  }

  @Post('manifests/:id/re-extract')
  async reExtract(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReExtractFieldDto,
  ) {
    await this.manifestsService.findOne(user, id);
    const jobId = await this.queueService.addExtractionJob(
      id,
      body.llmModelId,
      body.promptId,
      body.fieldName,
    );
    return { jobId };
  }

  @Post('manifests/:id/re-extract-field')
  async reExtractField(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReExtractFieldPreviewDto,
  ): Promise<ReExtractFieldPreviewResponseDto> {
    const manifest = await this.manifestsService.findOne(user, id);

    if (!manifest.ocrResult) {
      await this.manifestsService.processOcrForManifest(manifest);
    }

    const ocrPreview = this.manifestsService.buildOcrContextPreview(
      manifest,
      body.fieldName,
    );

    const estimate = await this.costEstimateService.estimateFieldCost({
      manifest,
      fieldName: body.fieldName,
      snippet: ocrPreview?.snippet ?? '',
      llmModelId: body.llmModelId,
    });

    if (body.previewOnly) {
      return {
        fieldName: body.fieldName,
        ocrPreview,
        estimatedCost: estimate.cost,
        currency: estimate.currency,
      };
    }

    const jobId = await this.queueService.addExtractionJob(
      id,
      body.llmModelId,
      body.promptId,
      body.fieldName,
      body.customPrompt,
      body.includeOcrContext ? ocrPreview?.snippet : undefined,
      estimate.cost,
    );

    return {
      jobId,
      fieldName: body.fieldName,
      ocrPreview,
      estimatedCost: estimate.cost,
      currency: estimate.currency,
    };
  }

  @Get('manifests/:id')
  async findOne(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const manifest = await this.manifestsService.findOne(user, id);
    return ManifestResponseDto.fromEntity(manifest);
  }

  @Get('manifests/:id/pdf')
  @Redirect()
  async viewPdf(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const manifest = await this.manifestsService.findOne(user, id);
    return { url: this.storageService.getPublicPath(manifest.storagePath) };
  }

  @Patch('manifests/:id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateManifestDto: UpdateManifestDto,
  ) {
    const manifest = await this.manifestsService.update(
      user,
      id,
      updateManifestDto,
    );
    return ManifestResponseDto.fromEntity(manifest);
  }

  @Delete('manifests/:id')
  async remove(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const manifest = await this.manifestsService.remove(user, id);
    return ManifestResponseDto.fromEntity(manifest);
  }

  private parseOptionalNumber(value?: string): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  }

  private parseOptionalDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed;
  }

  private parseOptionalBoolean(value?: string): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return undefined;
  }

  private isManualExtractionEnabled(): boolean {
    const flag = this.configService.get<boolean>('features.manualExtraction');
    return flag !== false;
  }

  private async autoExtractIfEnabled(
    user: UserEntity,
    manifestId: number,
  ): Promise<void> {
    if (this.isManualExtractionEnabled()) {
      return;
    }
    const manifest = await this.manifestsService.findOne(user, manifestId);
    const llmModelId = manifest.group?.project?.llmModelId ?? undefined;
    if (!llmModelId) {
      return;
    }
    await this.queueService.addExtractionJob(manifestId, llmModelId);
  }

  private async autoExtractBatchIfEnabled(
    user: UserEntity,
    manifestIds: number[],
  ): Promise<void> {
    if (this.isManualExtractionEnabled()) {
      return;
    }
    for (const manifestId of manifestIds) {
      await this.autoExtractIfEnabled(user, manifestId);
    }
  }

  private parseManifestIds(value?: string): number[] {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }

  private parseOptionalStatus(status?: string) {
    if (!status) {
      return undefined;
    }
    const normalized = status.toUpperCase();
    if (normalized in ManifestStatus) {
      return ManifestStatus[normalized as keyof typeof ManifestStatus];
    }
    return undefined;
  }
}
