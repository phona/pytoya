import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { UserEntity } from '../entities/user.entity';

export interface CsvExportFilters {
  status?: ManifestStatus;
  groupId?: number;
  projectId?: number;
  poNo?: string;
  department?: string;
  dateFrom?: Date;
  dateTo?: Date;
  humanVerified?: boolean;
  confidenceMin?: number;
  confidenceMax?: number;
}

type CsvRow = Record<string, string>;

const CSV_HEADERS = [
  'task_path',
  'po_no',
  'invoice_date',
  'department_code',
  'usage',
  'item_name',
  'quantity',
  'unit',
  'unit_price_ex_tax',
  'unit_price_inc_tax',
  'total_amount_inc_tax',
  'cost',
];

@Injectable()
export class CsvExportService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
  ) {}

  async exportCsv(
    user: UserEntity,
    filters: CsvExportFilters,
  ): Promise<{ filename: string; csv: string }> {
    const manifests = await this.fetchManifests(user, filters);
    const rows = manifests.flatMap((manifest) =>
      this.flattenManifest(manifest),
    );

    const filename = this.buildFilename(filters);
    const csv = this.buildCsv(rows);

    return { filename, csv };
  }

  async exportCsvByManifestIds(
    user: UserEntity,
    manifestIds: string[],
  ): Promise<{ filename: string; csv: string }> {
    const manifests = await this.fetchManifestsByIds(user, manifestIds);
    const rows = manifests.flatMap((manifest) =>
      this.flattenManifest(manifest),
    );

    const filename = this.buildBulkFilename();
    const csv = this.buildCsv(rows);

    return { filename, csv };
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
      query.andWhere('manifest.status = :status', {
        status: filters.status,
      });
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
      const pattern = this.normalizePoPattern(filters.poNo);
      query.andWhere(
        "manifest.extractedData -> 'invoice' ->> 'po_no' ILIKE :poNo",
        { poNo: pattern },
      );
    }

    if (filters.department) {
      const pattern = this.normalizeDepartmentPattern(filters.department);
      query.andWhere(
        "manifest.extractedData -> 'department' ->> 'code' ILIKE :department",
        { department: pattern },
      );
    }

    if (filters.dateFrom) {
      query.andWhere('manifest.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('manifest.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
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

    return query.getMany();
  }

  private async fetchManifestsByIds(
    user: UserEntity,
    manifestIds: string[],
  ): Promise<ManifestEntity[]> {
    if (manifestIds.length === 0) {
      return [];
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

  private flattenManifest(manifest: ManifestEntity): CsvRow[] {
    const data = (manifest.extractedData ?? {}) as Record<string, unknown>;
    const invoice = this.getRecord(data, 'invoice');
    const department = this.getRecord(data, 'department');
    const items = Array.isArray(data.items) ? data.items : [];

    const common = {
      task_path: this.buildTaskPath(manifest),
      po_no: this.toCellValue(invoice.po_no),
      invoice_date: this.toCellValue(invoice.invoice_date),
      department_code: this.toCellValue(department.code),
      usage: this.toCellValue(invoice.usage),
    };

    if (items.length === 0) {
      return [
        {
          ...common,
          item_name: '',
          quantity: '',
          unit: '',
          unit_price_ex_tax: '',
          unit_price_inc_tax: '',
          total_amount_inc_tax: '',
          cost: '',
        },
      ];
    }

    return items.map((item) => {
      const itemRecord =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {};
      return {
        ...common,
        item_name: this.toCellValue(itemRecord.name),
        quantity: this.toCellValue(itemRecord.quantity),
        unit: this.toCellValue(itemRecord.unit),
        unit_price_ex_tax: this.toCellValue(itemRecord.unit_price_ex_tax),
        unit_price_inc_tax: this.toCellValue(itemRecord.unit_price_inc_tax),
        total_amount_inc_tax: this.toCellValue(itemRecord.total_amount_inc_tax),
        cost: this.toCellValue(itemRecord.cost),
      };
    });
  }

  private buildTaskPath(manifest: ManifestEntity): string {
    const groupName = this.toCellValue(manifest.group?.name);
    const projectName = this.toCellValue(manifest.group?.project?.name);
    if (projectName && groupName) {
      return `${projectName}/${groupName}/${manifest.id}`;
    }
    if (groupName) {
      return `${groupName}/${manifest.id}`;
    }
    return String(manifest.id);
  }

  private getRecord(
    data: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> {
    const value = data[key];
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private toCellValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private buildCsv(rows: CsvRow[]): string {
    const lines = [CSV_HEADERS.join(',')];
    for (const row of rows) {
      const line = CSV_HEADERS.map((header) =>
        this.escapeCsvValue(row[header] ?? ''),
      ).join(',');
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
    if (filters.poNo) {
      const normalized = this.slugify(filters.poNo);
      if (normalized) {
        segments.push(`po-${normalized}`);
      }
    }
    if (filters.department) {
      const normalized = this.slugify(filters.department);
      if (normalized) {
        segments.push(`dept-${normalized}`);
      }
    }
    if (filters.dateFrom) {
      segments.push(`from-${this.formatDate(filters.dateFrom)}`);
    }
    if (filters.dateTo) {
      segments.push(`to-${this.formatDate(filters.dateTo)}`);
    }

    segments.push(this.formatTimestamp(new Date()));

    return `${segments.join('-')}.csv`;
  }

  private buildBulkFilename(): string {
    const timestamp = this.formatTimestamp(new Date());
    return `manifests-selected-${timestamp}.csv`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatTimestamp(date: Date): string {
    return date
      .toISOString()
      .replace(/[:T]/g, '-')
      .replace(/\..+/, '');
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private normalizePoPattern(value: string): string {
    if (value.includes('%') || value.includes('_')) {
      return value;
    }
    return `%${value}%`;
  }

  private normalizeDepartmentPattern(value: string): string {
    if (value.includes('%') || value.includes('_')) {
      return value;
    }
    return `%${value}%`;
  }
}
