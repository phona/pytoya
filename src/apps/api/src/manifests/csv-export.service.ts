import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { GroupEntity } from '../entities/group.entity';
import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { UserEntity } from '../entities/user.entity';
import { assertValidJsonPath, buildJsonPathQuery } from './utils/json-path.util';

export interface CsvExportFilters {
  status?: ManifestStatus;
  groupId?: number;
  projectId?: number;
  humanVerified?: boolean;
  confidenceMin?: number;
  confidenceMax?: number;
  ocrQualityMin?: number;
  ocrQualityMax?: number;
  extractionStatus?: 'not_extracted' | 'extracting' | 'complete' | 'partial' | 'failed';
  costMin?: number;
  costMax?: number;
  textExtractorId?: string;
  extractorType?: string;
  filter?: Record<string, string>;
}

type CsvRow = Record<string, string>;

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
const MAX_EXPORT_MANIFESTS = 5000;

@Injectable()
export class CsvExportService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(SchemaEntity)
    private readonly schemaRepository: Repository<SchemaEntity>,
  ) {}

  async exportCsv(
    user: UserEntity,
    filters: CsvExportFilters,
  ): Promise<{ filename: string; csv: string }> {
    const schemaColumns = await this.resolveSchemaColumnsForFilters(user, filters);
    const manifests = await this.fetchManifests(user, filters);
    const headers = this.buildHeaders(schemaColumns);
    const rows = manifests.map((manifest) =>
      this.buildRow(manifest, schemaColumns, headers.includes(FALLBACK_EXTRACTED_DATA_HEADER)),
    );

    const filename = this.buildFilename(filters);
    const csv = this.buildCsv(headers, rows);

    return { filename, csv };
  }

  async exportCsvByManifestIds(
    user: UserEntity,
    manifestIds: string[],
  ): Promise<{ filename: string; csv: string }> {
    const manifests = await this.fetchManifestsByIds(user, manifestIds);
    const schemaColumns = await this.resolveSchemaColumnsForManifests(manifests);
    const headers = this.buildHeaders(schemaColumns);
    const rows = manifests.map((manifest) =>
      this.buildRow(manifest, schemaColumns, headers.includes(FALLBACK_EXTRACTED_DATA_HEADER)),
    );

    const filename = this.buildBulkFilename();
    const csv = this.buildCsv(headers, rows);

    return { filename, csv };
  }

  private buildHeaders(schemaColumns: string[]): string[] {
    const normalized = schemaColumns
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (normalized.length === 0) {
      return [...METADATA_HEADERS, FALLBACK_EXTRACTED_DATA_HEADER];
    }

    return [...METADATA_HEADERS, ...normalized];
  }

  private buildRow(
    manifest: ManifestEntity,
    schemaColumns: string[],
    includeExtractedDataJson: boolean,
  ): CsvRow {
    const extractedData = (manifest.extractedData ?? null) as Record<string, unknown> | null;

    const row: CsvRow = {
      project_name: this.toCellValue(manifest.group?.project?.name),
      group_name: this.toCellValue(manifest.group?.name),
      manifest_id: String(manifest.id),
      original_filename: this.toCellValue(manifest.originalFilename),
      status: this.toCellValue(manifest.status),
      created_at: manifest.createdAt ? manifest.createdAt.toISOString() : '',
      confidence: manifest.confidence === null || manifest.confidence === undefined ? '' : String(manifest.confidence),
      human_verified: String(Boolean(manifest.humanVerified)),
      extraction_cost: manifest.extractionCost === null || manifest.extractionCost === undefined ? '' : String(manifest.extractionCost),
      extraction_cost_currency: this.toCellValue(manifest.extractionCostCurrency),
    };

    if (includeExtractedDataJson) {
      row[FALLBACK_EXTRACTED_DATA_HEADER] = extractedData ? this.safeJsonStringify(extractedData) : '';
      return row;
    }

    for (const path of schemaColumns) {
      const value = extractedData ? this.getValueAtPath(extractedData, path) : undefined;
      row[path] = this.toCellValue(value);
    }

    return row;
  }

  private getValueAtPath(
    root: Record<string, unknown>,
    fieldPath: string,
  ): unknown {
    const trimmed = fieldPath.trim();
    if (!trimmed) return undefined;
    if (trimmed.includes('[]')) return undefined;

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

  private toCellValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }
    return this.safeJsonStringify(value);
  }

  private safeJsonStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  private buildCsv(headers: string[], rows: CsvRow[]): string {
    const lines = [headers.join(',')];
    for (const row of rows) {
      const line = headers
        .map((header) => this.escapeCsvValue(row[header] ?? ''))
        .join(',');
      lines.push(line);
    }
    return lines.join('\n');
  }

  private escapeCsvValue(value: string): string {
    const needsQuotes =
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r');
    if (!needsQuotes) {
      return value;
    }
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
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
      query.andWhere('project.id = :projectId', { projectId: filters.projectId });
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

    const countQuery =
      typeof (query as any).clone === 'function'
        ? (query as any).clone()
        : query;
    const total = await countQuery.getCount();
    if (total > MAX_EXPORT_MANIFESTS) {
      throw new BadRequestException(
        `Too many manifests to export (${total}). Narrow your filters (max ${MAX_EXPORT_MANIFESTS}).`,
      );
    }

    return query.getMany();
  }

  private async fetchManifestsByIds(
    user: UserEntity,
    manifestIds: string[],
  ): Promise<ManifestEntity[]> {
    if (manifestIds.length === 0) {
      return [];
    }
    if (manifestIds.length > MAX_EXPORT_MANIFESTS) {
      throw new BadRequestException(
        `Too many manifests to export (${manifestIds.length}). Narrow your selection (max ${MAX_EXPORT_MANIFESTS}).`,
      );
    }

    return this.manifestRepository
      .createQueryBuilder('manifest')
      .innerJoinAndSelect('manifest.group', 'group')
      .innerJoinAndSelect('group.project', 'project')
      .where('project.ownerId = :ownerId', { ownerId: user.id })
      .andWhere('manifest.id IN (:...manifestIds)', { manifestIds })
      .orderBy('manifest.createdAt', 'DESC')
      .getMany();
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
    const projectIds = new Set<number>();
    for (const manifest of manifests) {
      const projectId = manifest.group?.project?.id;
      if (typeof projectId === 'number') {
        projectIds.add(projectId);
      }
    }

    if (projectIds.size !== 1) {
      return [];
    }

    const project = manifests[0]?.group?.project;
    const defaultSchemaId = project?.defaultSchemaId ?? null;
    if (!defaultSchemaId) {
      return [];
    }

    const schema = await this.schemaRepository.findOne({ where: { id: defaultSchemaId } });
    if (!schema) {
      return [];
    }

    return this.readXTableColumns(schema.jsonSchema);
  }

  private readXTableColumns(jsonSchema: Record<string, unknown>): string[] {
    const raw = (jsonSchema as Record<string, unknown>)['x-table-columns'];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private buildFilename(filters: CsvExportFilters): string {
    const segments: string[] = ['manifests'];

    if (filters.status) {
      segments.push(filters.status.toLowerCase());
    }
    if (filters.projectId) {
      segments.push(`project-${filters.projectId}`);
    }
    if (filters.groupId) {
      segments.push(`group-${filters.groupId}`);
    }
    if (filters.humanVerified !== undefined) {
      segments.push(filters.humanVerified ? 'verified' : 'unverified');
    }

    segments.push(this.formatTimestamp(new Date()));

    return `${segments.join('-')}.csv`;
  }

  private buildBulkFilename(): string {
    const timestamp = this.formatTimestamp(new Date());
    return `manifests-selected-${timestamp}.csv`;
  }

  private formatTimestamp(date: Date): string {
    return date
      .toISOString()
      .replace(/[:T]/g, '-')
      .replace(/\..+/, '');
  }

  private normalizeLikePattern(value: string): string {
    if (value.includes('%') || value.includes('_')) {
      return value;
    }
    return `%${value}%`;
  }
}
