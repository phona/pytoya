import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { JobEntity, JobStatus } from '../entities/job.entity';
import { ManifestEntity, ManifestStatus, FileType } from '../entities/manifest.entity';
import { UserEntity } from '../entities/user.entity';
import { GroupsService } from '../groups/groups.service';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { FileNotFoundException } from '../storage/exceptions/file-not-found.exception';
import { FileTooLargeException } from '../storage/exceptions/file-too-large.exception';
import { InvalidFileTypeException } from '../storage/exceptions/invalid-file-type.exception';
import { StorageService } from '../storage/storage.service';
import { UpdateManifestDto } from './dto/update-manifest.dto';
import { ManifestNotFoundException } from './exceptions/manifest-not-found.exception';
import { detectFileType } from './interceptors/pdf-file.interceptor';
import { DynamicFieldFiltersDto } from './dto/dynamic-field-filters.dto';
import {
  assertValidJsonPath,
  buildJsonPathQuery,
} from './utils/json-path.util';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 25;

const SORTABLE_COLUMNS: Record<string, string> = {
  filename: 'manifest.filename',
  status: 'manifest.status',
  poNo: 'manifest.purchaseOrder',
  invoiceDate: 'manifest.invoiceDate',
  confidence: 'manifest.confidence',
  department: 'manifest.department',
  humanVerified: 'manifest.humanVerified',
  createdAt: 'manifest.createdAt',
};

type ManifestListMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ManifestListResult = {
  data: ManifestEntity[];
  meta: ManifestListMeta;
};

@Injectable()
export class ManifestsService {
  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    private readonly groupsService: GroupsService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    user: UserEntity,
    groupId: number,
    file: Express.Multer.File | undefined,
  ): Promise<ManifestEntity> {
    const group = await this.groupsService.findOne(user, groupId);
    this.validateFile(file);

    if (!file) {
      throw new FileNotFoundException();
    }

    const detectedFileType = detectFileType(file.mimetype);
    if (detectedFileType === 'unknown') {
      throw new InvalidFileTypeException();
    }

    const storedFile = await this.storageService.saveFile(
      file,
      group.projectId,
      group.id,
    );

    const manifest = this.manifestRepository.create({
      filename: storedFile.filename,
      originalFilename: storedFile.originalFilename,
      storagePath: storedFile.storagePath,
      fileSize: storedFile.fileSize,
      fileType: detectedFileType === 'pdf' ? FileType.PDF : FileType.IMAGE,
      status: ManifestStatus.PENDING,
      groupId: group.id,
    });

    return this.manifestRepository.save(manifest);
  }

  async findByGroup(
    user: UserEntity,
    groupId: number,
    query: DynamicFieldFiltersDto = {},
  ): Promise<ManifestListResult> {
    await this.groupsService.findOne(user, groupId);

    const queryBuilder = this.manifestRepository
      .createQueryBuilder('manifest')
      .where('manifest.groupId = :groupId', { groupId });

    this.applyStandardFilters(queryBuilder, query);
    this.applyJsonbFilters(queryBuilder, query.filter);
    this.applySort(queryBuilder, query.sortBy, query.order);

    const shouldPaginate =
      query.page !== undefined || query.pageSize !== undefined;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    if (shouldPaginate) {
      const skip = Math.max(page - 1, 0) * pageSize;
      queryBuilder.skip(skip).take(pageSize);
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    const resolvedPageSize = shouldPaginate ? pageSize : total;
    const totalPages = resolvedPageSize
      ? Math.ceil(total / resolvedPageSize)
      : 0;

    return {
      data,
      meta: {
        total,
        page: shouldPaginate ? page : 1,
        pageSize: shouldPaginate ? resolvedPageSize : total,
        totalPages,
      },
    };
  }

  async findOne(user: UserEntity, id: number): Promise<ManifestEntity> {
    const manifest = await this.manifestRepository.findOne({
      where: { id },
      relations: ['group', 'group.project'],
    });

    if (!manifest) {
      throw new ManifestNotFoundException(id);
    }

    if (manifest.group.project.ownerId !== user.id) {
      throw new ProjectOwnershipException(manifest.group.projectId);
    }

    return manifest;
  }

  async update(
    user: UserEntity,
    id: number,
    input: UpdateManifestDto,
  ): Promise<ManifestEntity> {
    const manifest = await this.findOne(user, id);
    Object.assign(manifest, input);

    return this.manifestRepository.save(manifest);
  }

  async remove(user: UserEntity, id: number): Promise<ManifestEntity> {
    const manifest = await this.findOne(user, id);

    try {
      await this.storageService.deleteFile(manifest.storagePath);
    } catch (error) {
      if (!(error instanceof FileNotFoundException)) {
        throw error;
      }
    }

    return this.manifestRepository.remove(manifest);
  }

  async updateStatus(
    id: number,
    status: ManifestStatus,
  ): Promise<ManifestEntity> {
    const manifest = await this.findById(id);
    manifest.status = status;

    return this.manifestRepository.save(manifest);
  }

  async updateExtractedData(
    id: number,
    extractedData: Record<string, unknown>,
    confidence?: number,
  ): Promise<ManifestEntity> {
    const manifest = await this.findById(id);
    manifest.extractedData = extractedData;
    if (confidence !== undefined) {
      manifest.confidence = confidence;
    }

    return this.manifestRepository.save(manifest);
  }

  async createJob(
    manifestId: number,
    queueJobId: string,
    llmModelId?: string,
    promptId?: number,
  ): Promise<JobEntity> {
    await this.findById(manifestId);
    const job = this.jobRepository.create({
      manifestId,
      queueJobId,
      status: JobStatus.PENDING,
      llmModelId: llmModelId ?? null,
      promptId: promptId ?? null,
      progress: 0,
    });

    return this.jobRepository.save(job);
  }

  async updateJobProgress(
    manifestId: number,
    progress: number,
  ): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { manifestId },
      order: { createdAt: 'DESC' },
    });
    if (!job) {
      return null;
    }

    job.progress = this.normalizeProgress(progress);
    if (
      job.status === JobStatus.PENDING ||
      job.status === JobStatus.RUNNING
    ) {
      job.status = JobStatus.RUNNING;
    }
    if (!job.startedAt) {
      job.startedAt = new Date();
    }

    return this.jobRepository.save(job);
  }

  async updateJobCompleted(
    queueJobId: string,
    _result?: unknown,
    attemptCount?: number,
  ): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { queueJobId },
    });
    if (!job) {
      return null;
    }

    job.status = JobStatus.COMPLETED;
    job.progress = 100;
    job.completedAt = new Date();
    job.error = null;
    if (!job.startedAt) {
      job.startedAt = new Date();
    }
    if (attemptCount !== undefined) {
      job.attemptCount = attemptCount;
    }
    return this.jobRepository.save(job);
  }

  async updateJobFailed(
    queueJobId: string,
    error: unknown,
    attemptCount?: number,
  ): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { queueJobId },
    });
    if (!job) {
      return null;
    }

    job.status = JobStatus.FAILED;
    job.error = this.formatError(error);
    job.completedAt = new Date();
    if (!job.startedAt) {
      job.startedAt = new Date();
    }
    if (attemptCount !== undefined) {
      job.attemptCount = attemptCount;
    }

    return this.jobRepository.save(job);
  }

  private async findById(id: number): Promise<ManifestEntity> {
    const manifest = await this.manifestRepository.findOne({
      where: { id },
    });

    if (!manifest) {
      throw new ManifestNotFoundException(id);
    }

    return manifest;
  }

  private validateFile(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new FileNotFoundException();
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeException();
    }
  }

  private normalizeProgress(progress: number): number {
    const normalized = Math.round(progress);
    if (normalized < 0) {
      return 0;
    }
    if (normalized > 100) {
      return 100;
    }
    return normalized;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private applyStandardFilters(
    query: SelectQueryBuilder<ManifestEntity>,
    filters: DynamicFieldFiltersDto,
  ): void {
    if (filters.status) {
      query.andWhere('manifest.status = :status', {
        status: filters.status,
      });
    }

    if (filters.poNo) {
      query.andWhere('manifest.purchaseOrder ILIKE :poNo', {
        poNo: this.normalizeLikePattern(filters.poNo),
      });
    }

    if (filters.department) {
      query.andWhere('manifest.department ILIKE :department', {
        department: this.normalizeLikePattern(filters.department),
      });
    }

    if (filters.dateFrom) {
      query.andWhere('manifest.invoiceDate >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('manifest.invoiceDate <= :dateTo', {
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
  }

  private applyJsonbFilters(
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

  private applySort(
    query: SelectQueryBuilder<ManifestEntity>,
    sortBy?: string,
    order: 'asc' | 'desc' = 'asc',
  ): void {
    const normalizedOrder = order === 'desc' ? 'DESC' : 'ASC';

    if (!sortBy) {
      query.orderBy('manifest.createdAt', 'DESC');
      return;
    }

    const mappedColumn = SORTABLE_COLUMNS[sortBy];
    if (mappedColumn) {
      query.orderBy(mappedColumn, normalizedOrder);
      return;
    }

    assertValidJsonPath(sortBy);
    const textExpression = buildJsonPathQuery('manifest', sortBy);
    const numericExpression = `CASE WHEN ${textExpression} ~ '^[0-9]+(\\\\.[0-9]+)?$' THEN (${textExpression})::numeric ELSE NULL END`;

    query.orderBy(numericExpression, normalizedOrder, 'NULLS LAST');
    query.addOrderBy(textExpression, normalizedOrder, 'NULLS LAST');
  }

  private normalizeLikePattern(value: string): string {
    if (value.includes('%') || value.includes('_')) {
      return value;
    }
    return `%${value}%`;
  }
}
