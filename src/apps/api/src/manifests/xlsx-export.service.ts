import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

import type { UserEntity } from '../entities/user.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ManifestItemEntity } from '../entities/manifest-item.entity';
import type { CsvExportFilters } from './csv-export.service';
import { toXlsxCellValue } from './xlsx-export.util';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MAX_EXPORT_MANIFESTS = 5000;
const MAX_EXPORT_ITEMS = 100_000;

export type XlsxExportResult = {
  filename: string;
  contentType: typeof XLSX_MIME;
  stream: PassThrough;
};

@Injectable()
export class XlsxExportService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ManifestItemEntity)
    private readonly manifestItemRepository: Repository<ManifestItemEntity>,
  ) {}

  async exportXlsx(
    user: UserEntity,
    filters: CsvExportFilters,
  ): Promise<XlsxExportResult> {
    const manifests = await this.fetchManifests(user, filters);
    if (manifests.length > MAX_EXPORT_MANIFESTS) {
      throw new BadRequestException(
        `Too many manifests to export (${manifests.length}). Narrow your filters (max ${MAX_EXPORT_MANIFESTS}).`,
      );
    }

    const manifestIds = manifests.map((m) => m.id);
    const items = await this.fetchItems(manifestIds);
    if (items.length > MAX_EXPORT_ITEMS) {
      throw new BadRequestException(
        `Too many items to export (${items.length}). Narrow your filters (max ${MAX_EXPORT_ITEMS}).`,
      );
    }

    const filename = this.buildFilename('filtered');
    return this.buildWorkbookStream({
      filename,
      scope: 'filtered',
      manifests,
      items,
      meta: { filters },
    });
  }

  async exportXlsxByManifestIds(
    user: UserEntity,
    manifestIds: number[],
  ): Promise<XlsxExportResult> {
    if (manifestIds.length > MAX_EXPORT_MANIFESTS) {
      throw new BadRequestException(
        `Too many manifests to export (${manifestIds.length}). Narrow your selection (max ${MAX_EXPORT_MANIFESTS}).`,
      );
    }

    const manifests = await this.fetchManifestsByIds(user, manifestIds);
    const items = await this.fetchItems(manifestIds);
    if (items.length > MAX_EXPORT_ITEMS) {
      throw new BadRequestException(
        `Too many items to export (${items.length}). Narrow your selection (max ${MAX_EXPORT_ITEMS}).`,
      );
    }

    const filename = this.buildFilename('selected');
    return this.buildWorkbookStream({
      filename,
      scope: 'selected',
      manifests,
      items,
      meta: { manifestIds },
    });
  }

  private buildWorkbookStream(options: {
    filename: string;
    scope: 'filtered' | 'selected';
    manifests: ManifestEntity[];
    items: ManifestItemEntity[];
    meta: Record<string, unknown>;
  }): XlsxExportResult {
    const stream = new PassThrough();

    void (async () => {
      try {
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
          stream,
          useStyles: false,
          useSharedStrings: true,
        });

        this.writeManifestsSheet(workbook, options.manifests);
        this.writeItemsSheet(workbook, options.manifests, options.items);
        this.writeMetaSheet(workbook, {
          scope: options.scope,
          manifests: options.manifests.length,
          items: options.items.length,
          ...options.meta,
        });

        await workbook.commit();
      } catch (error) {
        stream.destroy(error as Error);
      }
    })();

    return {
      filename: options.filename,
      contentType: XLSX_MIME,
      stream,
    };
  }

  private writeManifestsSheet(
    workbook: ExcelJS.stream.xlsx.WorkbookWriter,
    manifests: ManifestEntity[],
  ) {
    const ws = workbook.addWorksheet('Manifests');
    const headers = [
      'manifest_id',
      'task_path',
      'filename',
      'status',
      'created_at',
      'human_verified',
      'confidence',
      'po_no',
      'invoice_date',
      'department_code',
      'usage',
      'ocr_quality_score',
      'extraction_cost',
    ];
    ws.addRow(headers).commit();

    for (const manifest of manifests) {
      const data = (manifest.extractedData ?? {}) as Record<string, unknown>;
      const invoice = this.getRecord(data, 'invoice');
      const department = this.getRecord(data, 'department');

      ws.addRow([
        toXlsxCellValue(manifest.id),
        toXlsxCellValue(this.buildTaskPath(manifest)),
        toXlsxCellValue(manifest.originalFilename || manifest.filename),
        toXlsxCellValue(manifest.status),
        toXlsxCellValue(manifest.createdAt),
        toXlsxCellValue(manifest.humanVerified),
        toXlsxCellValue(manifest.confidence),
        toXlsxCellValue(invoice.po_no),
        toXlsxCellValue(invoice.invoice_date),
        toXlsxCellValue(department.code),
        toXlsxCellValue(invoice.usage),
        toXlsxCellValue(manifest.ocrQualityScore),
        toXlsxCellValue(manifest.extractionCost),
      ]).commit();
    }

    ws.commit();
  }

  private writeItemsSheet(
    workbook: ExcelJS.stream.xlsx.WorkbookWriter,
    manifests: ManifestEntity[],
    items: ManifestItemEntity[],
  ) {
    const ws = workbook.addWorksheet('Items');
    const headers = [
      'manifest_id',
      'task_path',
      'item_id',
      'description',
      'quantity',
      'unit_price',
      'total_price',
    ];
    ws.addRow(headers).commit();

    const taskPathByManifestId = new Map<number, string>();
    for (const manifest of manifests) {
      taskPathByManifestId.set(manifest.id, this.buildTaskPath(manifest));
    }

    for (const item of items) {
      ws.addRow([
        toXlsxCellValue(item.manifestId),
        toXlsxCellValue(taskPathByManifestId.get(item.manifestId) ?? ''),
        toXlsxCellValue(item.id),
        toXlsxCellValue(item.description),
        toXlsxCellValue(item.quantity),
        toXlsxCellValue(item.unitPrice),
        toXlsxCellValue(item.totalPrice),
      ]).commit();
    }

    ws.commit();
  }

  private writeMetaSheet(
    workbook: ExcelJS.stream.xlsx.WorkbookWriter,
    meta: Record<string, unknown>,
  ) {
    const ws = workbook.addWorksheet('Meta');
    ws.addRow(['key', 'value']).commit();

    const exportedAt = new Date().toISOString();
    ws.addRow(['exported_at', toXlsxCellValue(exportedAt)]).commit();

    for (const [key, value] of Object.entries(meta)) {
      ws.addRow([toXlsxCellValue(key), toXlsxCellValue(value)]).commit();
    }

    ws.commit();
  }

  private async fetchManifests(
    user: UserEntity,
    filters: CsvExportFilters,
  ): Promise<ManifestEntity[]> {
    const query = this.manifestRepository
      .createQueryBuilder('manifest')
      .innerJoinAndSelect('manifest.group', 'group')
      .innerJoinAndSelect('group.project', 'project')
      .where('project.ownerId = :ownerId', { ownerId: user.id })
      .orderBy('manifest.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('manifest.status = :status', { status: filters.status });
    }
    if (filters.groupId) {
      query.andWhere('group.id = :groupId', { groupId: filters.groupId });
    }
    if (filters.projectId) {
      query.andWhere('project.id = :projectId', {
        projectId: filters.projectId,
      });
    }
    if (filters.poNo) {
      query.andWhere(
        "manifest.extractedData -> 'invoice' ->> 'po_no' ILIKE :poNo",
        { poNo: this.normalizePattern(filters.poNo) },
      );
    }
    if (filters.department) {
      query.andWhere(
        "manifest.extractedData -> 'department' ->> 'code' ILIKE :department",
        { department: this.normalizePattern(filters.department) },
      );
    }
    if (filters.dateFrom) {
      query.andWhere('manifest.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      query.andWhere('manifest.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }
    if (filters.humanVerified !== undefined) {
      query.andWhere('manifest.humanVerified = :humanVerified', {
        humanVerified: filters.humanVerified,
      });
    }
    if (filters.confidenceMin !== undefined) {
      query.andWhere('manifest.confidence >= :confidenceMin', {
        confidenceMin: filters.confidenceMin,
      });
    }
    if (filters.confidenceMax !== undefined) {
      query.andWhere('manifest.confidence <= :confidenceMax', {
        confidenceMax: filters.confidenceMax,
      });
    }

    return query.getMany();
  }

  private async fetchManifestsByIds(
    user: UserEntity,
    manifestIds: number[],
  ): Promise<ManifestEntity[]> {
    if (manifestIds.length === 0) return [];

    return this.manifestRepository
      .createQueryBuilder('manifest')
      .innerJoinAndSelect('manifest.group', 'group')
      .innerJoinAndSelect('group.project', 'project')
      .where('project.ownerId = :ownerId', { ownerId: user.id })
      .andWhere('manifest.id IN (:...manifestIds)', { manifestIds })
      .orderBy('manifest.createdAt', 'DESC')
      .getMany();
  }

  private async fetchItems(manifestIds: number[]): Promise<ManifestItemEntity[]> {
    if (manifestIds.length === 0) return [];

    return this.manifestItemRepository.find({
      where: { manifestId: In(manifestIds) },
      order: { id: 'ASC' },
    });
  }

  private buildFilename(scope: 'filtered' | 'selected') {
    const date = new Date().toISOString().split('T')[0];
    return `manifests-export-${scope}-${date}.xlsx`;
  }

  private buildTaskPath(manifest: ManifestEntity): string {
    const groupName = String(manifest.group?.name ?? '');
    const projectName = String(manifest.group?.project?.name ?? '');
    if (projectName && groupName) return `${projectName}/${groupName}/${manifest.id}`;
    if (groupName) return `${groupName}/${manifest.id}`;
    return String(manifest.id);
  }

  private getRecord(
    data: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> {
    const value = data[key];
    if (value && typeof value === 'object') return value as Record<string, unknown>;
    return {};
  }

  private normalizePattern(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '%';
    return trimmed.includes('%') ? trimmed : `%${trimmed}%`;
  }
}

