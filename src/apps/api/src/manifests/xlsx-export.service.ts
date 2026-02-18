import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

import type { UserEntity } from '../entities/user.entity';
import { GroupEntity } from '../entities/group.entity';
import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { ManifestItemEntity } from '../entities/manifest-item.entity';
import { ProjectEntity } from '../entities/project.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { ExportScriptsService } from '../export-scripts/export-scripts.service';
import type { CsvExportFilters } from './csv-export.service';
import { toXlsxCellValue } from './xlsx-export.util';
import { assertValidJsonPath, buildJsonPathQuery } from './utils/json-path.util';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MAX_EXPORT_MANIFESTS = 5000;
const MAX_EXPORT_ITEMS = 100_000;

const METADATA_HEADERS = [
  'project_name',
  'group_name',
  'manifest_id',
  'original_filename',
  'status',
  'created_at',
  'confidence',
  'human_verified',
  'extraction_cost',
  'extraction_cost_currency',
] as const;

const FALLBACK_EXTRACTED_DATA_HEADER = 'extractedDataJson';

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
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(SchemaEntity)
    private readonly schemaRepository: Repository<SchemaEntity>,
    private readonly exportScriptsService: ExportScriptsService,
  ) {}

  async exportXlsx(
    user: UserEntity,
    filters: CsvExportFilters,
  ): Promise<XlsxExportResult> {
    const schemaColumns = await this.resolveSchemaColumnsForFilters(user, filters);
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
      schemaColumns,
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
    const schemaColumns = await this.resolveSchemaColumnsForManifests(manifests);
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
      schemaColumns,
      meta: { manifestIds },
    });
  }

  private buildWorkbookStream(options: {
    filename: string;
    scope: 'filtered' | 'selected';
    manifests: ManifestEntity[];
    items: ManifestItemEntity[];
    schemaColumns: string[];
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

        await this.writeManifestsSheet(workbook, options.manifests, options.schemaColumns);
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

  private async writeManifestsSheet(
    workbook: ExcelJS.stream.xlsx.WorkbookWriter,
    manifests: ManifestEntity[],
    schemaColumns: string[],
  ) {
    const ws = workbook.addWorksheet('Manifests');
    const normalizedColumns = schemaColumns
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    // First pass: collect all exported rows to determine columns
    const exportedDataByManifest = new Map<ManifestEntity, Record<string, unknown>[]>();
    const dynamicColumnSet = new Set<string>();

    for (const manifest of manifests) {
      const project = manifest.group?.project;
      const exportRows = await this.exportScriptsService.exportRowsForManifest({
        format: 'xlsx',
        schemaColumns: normalizedColumns,
        project: { id: project?.id ?? 0, name: project?.name },
        manifest: {
          id: manifest.id,
          groupName: manifest.group?.name,
          createdAt: manifest.createdAt ?? null,
          originalFilename: (manifest.originalFilename || manifest.filename) ?? null,
          status: manifest.status ?? null,
          confidence: manifest.confidence ?? null,
          humanVerified: manifest.humanVerified ?? null,
          extractionCost: manifest.extractionCost ?? null,
          extractionCostCurrency: manifest.extractionCostCurrency ?? null,
        },
        extractedData: (manifest.extractedData ?? null) as Record<string, unknown> | null,
      });

      exportedDataByManifest.set(manifest, exportRows);

      // Collect column keys from export script output when no schema columns defined
      if (normalizedColumns.length === 0) {
        for (const row of exportRows) {
          for (const key of Object.keys(row)) {
            dynamicColumnSet.add(key);
          }
        }
      }
    }

    // Determine headers: schema columns take precedence, then dynamic columns, then fallback
    const dynamicColumns = Array.from(dynamicColumnSet);
    const useDynamicColumns = normalizedColumns.length === 0 && dynamicColumns.length > 0;
    const dataHeaders = useDynamicColumns ? dynamicColumns : normalizedColumns;
    const headers =
      dataHeaders.length === 0
        ? [...METADATA_HEADERS, FALLBACK_EXTRACTED_DATA_HEADER]
        : [...METADATA_HEADERS, ...dataHeaders];

    ws.addRow(headers).commit();

    // Second pass: write data rows with determined headers
    for (const [manifest, exportRows] of exportedDataByManifest) {
      for (const exportedRow of exportRows) {
        const row: Record<string, unknown> = {
          project_name: manifest.group?.project?.name ?? '',
          group_name: manifest.group?.name ?? '',
          manifest_id: manifest.id,
          original_filename: manifest.originalFilename || manifest.filename,
          status: manifest.status,
          created_at: manifest.createdAt,
          confidence: manifest.confidence ?? null,
          human_verified: Boolean(manifest.humanVerified),
          extraction_cost: manifest.extractionCost ?? null,
          extraction_cost_currency: manifest.extractionCostCurrency ?? null,
        };

        if (dataHeaders.length === 0) {
          row[FALLBACK_EXTRACTED_DATA_HEADER] = this.safeJsonStringify(exportedRow);
        } else {
          for (const path of dataHeaders) {
            row[path] = this.resolveExportedValue(exportedRow, path);
          }
        }

        ws.addRow(headers.map((header) => toXlsxCellValue(row[header]))).commit();
      }
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

    const ocrQualityMin = filters.ocrQualityMin;
    const ocrQualityMax = filters.ocrQualityMax;
    const wantsUnprocessed =
      ocrQualityMin === 0 &&
      ocrQualityMax === 0 &&
      ocrQualityMin !== undefined &&
      ocrQualityMax !== undefined;

    if (wantsUnprocessed) {
      query.andWhere('(manifest.ocrQualityScore IS NULL)');
    } else {
      if (ocrQualityMin !== undefined) {
        query.andWhere('manifest.ocrQualityScore >= :ocrQualityMin', {
          ocrQualityMin,
        });
      }
      if (ocrQualityMax !== undefined) {
        query.andWhere('manifest.ocrQualityScore <= :ocrQualityMax', {
          ocrQualityMax,
        });
      }
    }

    if (filters.costMin !== undefined) {
      query.andWhere('manifest.extractionCost >= :costMin', { costMin: filters.costMin });
    }

    if (filters.costMax !== undefined) {
      query.andWhere('manifest.extractionCost <= :costMax', { costMax: filters.costMax });
    }

    if (filters.textExtractorId) {
      query.andWhere('manifest.textExtractorId = :textExtractorId', {
        textExtractorId: filters.textExtractorId,
      });
    }

    if (filters.extractorType) {
      query.leftJoin('manifest.textExtractor', 'extractor');
      query.andWhere('extractor.extractorType = :extractorType', {
        extractorType: filters.extractorType,
      });
    }

    if (filters.extractionStatus) {
      const errorCountExpr =
        "COALESCE((manifest.validationResults ->> 'errorCount')::int, 0)";
      switch (filters.extractionStatus) {
        case 'not_extracted':
          query.andWhere('manifest.extractedData IS NULL');
          query.andWhere('manifest.status = :statusPending', {
            statusPending: ManifestStatus.PENDING,
          });
          break;
        case 'extracting':
          query.andWhere('manifest.status = :statusProcessing', {
            statusProcessing: ManifestStatus.PROCESSING,
          });
          break;
        case 'failed':
          query.andWhere('manifest.status = :statusFailed', {
            statusFailed: ManifestStatus.FAILED,
          });
          break;
        case 'complete':
          query.andWhere('manifest.status = :statusCompleted', {
            statusCompleted: ManifestStatus.COMPLETED,
          });
          query.andWhere(`${errorCountExpr} = 0`);
          break;
        case 'partial':
          query.andWhere('manifest.status = :statusCompleted', {
            statusCompleted: ManifestStatus.COMPLETED,
          });
          query.andWhere(`${errorCountExpr} > 0`);
          break;
      }
    }

    this.applyDynamicFilters(query, filters.filter);

    return query.getMany();
  }

  private applyDynamicFilters(
    query: SelectQueryBuilder<ManifestEntity>,
    filters?: Record<string, string>,
  ): void {
    if (!filters) {
      return;
    }

    let index = 0;
    for (const [fieldPath, rawValue] of Object.entries(filters)) {
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        continue;
      }
      if (fieldPath === 'status') {
        query.andWhere('manifest.status = :statusFilter', {
          statusFilter: String(rawValue).toLowerCase(),
        });
        continue;
      }
      assertValidJsonPath(fieldPath);
      const expression = buildJsonPathQuery('manifest', fieldPath);
      const paramName = `filterValue${index++}`;
      query.andWhere(`${expression} ILIKE :${paramName}`, {
        [paramName]: this.normalizeLikePattern(String(rawValue)),
      });
    }
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

  private resolveExportedValue(root: Record<string, unknown>, fieldPath: string): unknown {
    const trimmed = fieldPath.trim();
    if (!trimmed) return undefined;
    if (trimmed.includes('[]')) return undefined;

    if (Object.prototype.hasOwnProperty.call(root, trimmed)) {
      return root[trimmed];
    }

    const segments = trimmed.split('.');
    let current: unknown = root;
    for (const segment of segments) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  private safeJsonStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  private async resolveSchemaColumnsForFilters(
    user: UserEntity,
    filters: CsvExportFilters,
  ): Promise<string[]> {
    const project = await this.resolveProjectForFilters(user, filters);
    if (!project?.defaultSchemaId) {
      return [];
    }

    const schema = await this.schemaRepository.findOne({
      where: { id: project.defaultSchemaId },
    });
    if (!schema) {
      return [];
    }

    return this.readXTableColumns(schema.jsonSchema);
  }

  private async resolveProjectForFilters(
    user: UserEntity,
    filters: CsvExportFilters,
  ): Promise<ProjectEntity | null> {
    if (filters.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: filters.projectId, ownerId: user.id },
      });
      return project ?? null;
    }

    if (filters.groupId) {
      const group = await this.groupRepository.findOne({
        where: { id: filters.groupId },
        relations: ['project'],
      });
      if (!group?.project || group.project.ownerId !== user.id) {
        return null;
      }
      return group.project;
    }

    return null;
  }

  private async resolveSchemaColumnsForManifests(
    manifests: ManifestEntity[],
  ): Promise<string[]> {
    const projectIds = Array.from(
      new Set(manifests.map((manifest) => manifest.group?.project?.id).filter((id): id is number => typeof id === 'number')),
    );

    if (projectIds.length !== 1) {
      return [];
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectIds[0] },
    });
    if (!project?.defaultSchemaId) {
      return [];
    }

    const schema = await this.schemaRepository.findOne({
      where: { id: project.defaultSchemaId },
    });
    if (!schema) {
      return [];
    }

    return this.readXTableColumns(schema.jsonSchema);
  }

  private readXTableColumns(schema: Record<string, unknown> | null | undefined): string[] {
    const raw = schema && typeof schema === 'object' ? (schema as Record<string, unknown>)['x-table-columns'] : null;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((value): value is string => typeof value === 'string');
  }

  private normalizeLikePattern(value: string): string {
    if (value.includes('%') || value.includes('_')) {
      return value;
    }
    return `%${value}%`;
  }
}
