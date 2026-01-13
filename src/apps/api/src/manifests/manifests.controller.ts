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

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManifestStatus } from '../entities/manifest.entity';
import { UserEntity } from '../entities/user.entity';
import { StorageService } from '../storage/storage.service';
import { FileNotFoundException } from '../storage/exceptions/file-not-found.exception';
import { CsvExportService } from './csv-export.service';
import { ExportBulkDto } from './dto/export-bulk.dto';
import { UpdateManifestDto } from './dto/update-manifest.dto';
import { ManifestsService } from './manifests.service';
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
    private readonly storageService: StorageService,
  ) {}

  @Post('groups/:groupId/manifests/upload')
  @UseInterceptors(PdfFileInterceptor)
  async uploadSingle(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.manifestsService.create(user, groupId, file);
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

    return Promise.all(
      files.map((file) => this.manifestsService.create(user, groupId, file)),
    );
  }

  @Get('groups/:groupId/manifests')
  async findByGroup(
    @CurrentUser() user: UserEntity,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.manifestsService.findByGroup(user, groupId);
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

  @Get('manifests/:id')
  async findOne(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.manifestsService.findOne(user, id);
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
    return this.manifestsService.update(user, id, updateManifestDto);
  }

  @Delete('manifests/:id')
  async remove(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.manifestsService.remove(user, id);
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
