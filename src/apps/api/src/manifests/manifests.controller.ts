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
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'fs';
import * as path from 'path';
import { SkipThrottle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileType, ManifestStatus } from '../entities/manifest.entity';
import { UserEntity } from '../entities/user.entity';
import { StorageService } from '../storage/storage.service';
import { CsvExportService } from './csv-export.service';
import { BulkExtractDto } from './dto/bulk-extract.dto';
import { DeleteManifestsBulkDto, DeleteManifestsBulkResponseDto } from './dto/delete-manifests-bulk.dto';
import { ExtractFilteredDto } from './dto/extract-filtered.dto';
import { ExtractFilteredResponseDto } from './dto/extract-filtered-response.dto';
import { ExportBulkDto } from './dto/export-bulk.dto';
import { ExtractDto } from './dto/extract.dto';
import { ExportManifestsDto } from './dto/export-manifests.dto';
import { ManifestResponseDto } from './dto/manifest-response.dto';
import { ManifestItemResponseDto } from './dto/manifest-item-response.dto';
import { OcrResultResponseDto } from './dto/ocr-result.dto';
import { RefreshOcrDto } from './dto/refresh-ocr.dto';
import { ReExtractFieldDto } from './dto/re-extract-field.dto';
import { UpdateManifestDto } from './dto/update-manifest.dto';
import { DynamicFieldFiltersDto } from './dto/dynamic-field-filters.dto';
import { ManifestExportFiltersDto } from './dto/manifest-export-filters.dto';
import { ManifestExtractionHistoryEntryDto } from './dto/manifest-extraction-history.dto';
import { ManifestExtractionHistoryEntryDetailsDto } from './dto/manifest-extraction-history-details.dto';
import { ManifestOcrHistoryEntryDto } from './dto/manifest-ocr-history.dto';
import { ManifestsService } from './manifests.service';
import { QueueService } from '../queue/queue.service';
import {
  PdfFileInterceptor,
  PdfFilesInterceptor,
} from './interceptors/pdf-file.interceptor';
import { ExtractManifestsUseCase } from '../usecases/extract-manifests.usecase';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';
import { UploadManifestsUseCase } from '../usecases/upload-manifests.usecase';
import { XlsxExportService } from './xlsx-export.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ManifestsController {
  constructor(
    private readonly csvExportService: CsvExportService,
    private readonly xlsxExportService: XlsxExportService,
    private readonly manifestsService: ManifestsService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
    private readonly uploadManifestsUseCase: UploadManifestsUseCase,
    private readonly extractManifestsUseCase: ExtractManifestsUseCase,
    private readonly updateManifestUseCase: UpdateManifestUseCase,
  ) {}

  @Post('groups/:groupId/manifests/upload')
  @UseInterceptors(PdfFileInterceptor)
  async uploadSingle(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const result = await this.uploadManifestsUseCase.uploadSingle(
      user,
      groupId,
      file,
    );
    return { ...ManifestResponseDto.fromEntity(result.manifest), isDuplicate: result.isDuplicate };
  }

  @Post('groups/:groupId/manifests/batch')
  @UseInterceptors(PdfFilesInterceptor)
  async uploadBatch(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    const results = await this.uploadManifestsUseCase.uploadBatch(
      user,
      groupId,
      files,
    );
    return results.map((r) => ({ ...ManifestResponseDto.fromEntity(r.manifest), isDuplicate: r.isDuplicate }));
  }

  // Alias for uploadSingle - canonical path expected by web app
  @Post('groups/:groupId/manifests')
  @UseInterceptors(PdfFileInterceptor)
  async upload(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const result = await this.uploadManifestsUseCase.uploadSingle(
      user,
      groupId,
      file,
    );
    return { ...ManifestResponseDto.fromEntity(result.manifest), isDuplicate: result.isDuplicate };
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

    return {
      data,
      meta: result.meta,
    };
  }

  @Get('groups/:groupId/manifests/ids')
  async findIdsByGroup(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() query: DynamicFieldFiltersDto,
  ) {
    return this.manifestsService.findIdsByGroup(user, groupId, query);
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

  @Post('manifests/:id/ocr/refresh')
  async refreshOcrResult(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RefreshOcrDto,
  ): Promise<OcrResultResponseDto> {
    const manifest = await this.manifestsService.findOne(user, id);

    const ocrResult = await this.manifestsService.processOcrForManifest(manifest, {
      force: true,
      textExtractorId: body.textExtractorId,
    });

    return {
      manifestId: manifest.id,
      ocrResult,
      hasOcr: Boolean(ocrResult),
      ocrProcessedAt: manifest.ocrProcessedAt ?? null,
      qualityScore: manifest.ocrQualityScore ?? null,
    };
  }

  @Post('manifests/:id/ocr/refresh-job')
  async queueOcrRefreshJob(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RefreshOcrDto,
  ): Promise<{ jobId: string }> {
    await this.manifestsService.findOne(user, id);
    const jobId = await this.queueService.addOcrRefreshJob(id, body.textExtractorId);
    return { jobId };
  }

  @Get('manifests/:id/items')
  @SkipThrottle()
  async getManifestItems(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const items = await this.manifestsService.findItems(user, id);
    return items.map(ManifestItemResponseDto.fromEntity);
  }

  @Get('manifests/export/csv')
  async exportCsv(
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) response: Response,
    @Query() query: ManifestExportFiltersDto,
  ) {
    const { filename, csv } = await this.csvExportService.exportCsv(
      user,
      query,
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return csv;
  }

  @Get('manifests/export/xlsx')
  async exportXlsx(
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) response: Response,
    @Query() query: ManifestExportFiltersDto,
  ) {
    const { filename, stream, contentType } =
      await this.xlsxExportService.exportXlsx(user, query);

    response.setHeader('Content-Type', contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return new StreamableFile(stream);
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
  @Post('manifests/export/xlsx')
  async exportManifestsXlsx(
    @CurrentUser() user: UserEntity,
    @Body() body: ExportManifestsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { filename, stream, contentType } =
      await this.xlsxExportService.exportXlsxByManifestIds(user, body.manifestIds);

    response.setHeader('Content-Type', contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return new StreamableFile(stream);
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
    return this.extractManifestsUseCase.extractSingle(user, id, body);
  }

  @Post('manifests/extract-bulk')
  async extractBulk(
    @CurrentUser() user: UserEntity,
    @Body() body: BulkExtractDto,
  ) {
    return this.extractManifestsUseCase.extractBulk(user, body);
  }

  @Post('groups/:groupId/manifests/extract-filtered')
  async extractFiltered(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() body: ExtractFilteredDto,
  ): Promise<ExtractFilteredResponseDto> {
    return this.extractManifestsUseCase.extractFiltered(user, groupId, body);
  }

  @Post('groups/:groupId/manifests/delete-bulk')
  async deleteBulk(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() body: DeleteManifestsBulkDto,
  ): Promise<DeleteManifestsBulkResponseDto> {
    return this.manifestsService.removeMany(user, groupId, body.manifestIds);
  }

  @Post('manifests/:id/re-extract')
  async reExtract(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReExtractFieldDto,
  ) {
    return this.extractManifestsUseCase.reExtract(user, id, body);
  }

  @Get('manifests/:id')
  async findOne(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const manifest = await this.manifestsService.findOne(user, id);
    return ManifestResponseDto.fromEntity(manifest);
  }

  @Get('manifests/:id/extraction-history')
  async getExtractionHistory(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ): Promise<ManifestExtractionHistoryEntryDto[]> {
    const parsedLimit = this.parseOptionalNumber(limit ?? undefined);
    return this.manifestsService.listExtractionHistory(user, id, {
      limit: parsedLimit ?? undefined,
    });
  }

  @Get('manifests/:id/ocr-history')
  async getOcrHistory(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ): Promise<ManifestOcrHistoryEntryDto[]> {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.manifestsService.listOcrHistory(user, id, {
      limit: Number.isFinite(parsedLimit as number) ? (parsedLimit as number) : undefined,
    });
  }

  @Get('manifests/:id/extraction-history/:jobId')
  async getExtractionHistoryEntry(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Param('jobId', ParseIntPipe) jobId: number,
  ): Promise<ManifestExtractionHistoryEntryDetailsDto> {
    return this.manifestsService.getExtractionHistoryEntry(user, id, jobId);
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

  @Get('manifests/:id/pdf-file')
  async downloadPdfFile(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const manifest = await this.manifestsService.findOne(user, id);

    const filename = manifest.originalFilename || manifest.filename || `manifest-${manifest.id}`;
    const ext = path.extname(filename).toLowerCase();
    const contentType = (() => {
      if (manifest.fileType === FileType.PDF || ext === '.pdf') return 'application/pdf';
      if (ext === '.png') return 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
      if (ext === '.webp') return 'image/webp';
      if (ext === '.gif') return 'image/gif';
      if (ext === '.bmp') return 'image/bmp';
      return 'application/octet-stream';
    })();

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename.split('"').join('')}"`);

    const stream = createReadStream(manifest.storagePath);
    stream.on('error', () => {
      res.status(404).json({ message: 'File not found' });
    });

    stream.pipe(res);
  }

  @Patch('manifests/:id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateManifestDto: UpdateManifestDto,
  ) {
    const manifest = await this.updateManifestUseCase.update(
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
