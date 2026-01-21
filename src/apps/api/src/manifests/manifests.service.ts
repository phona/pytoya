import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';

import { JobEntity, JobStatus } from '../entities/job.entity';
import { ManifestEntity, ManifestStatus, FileType } from '../entities/manifest.entity';
import { ManifestItemEntity } from '../entities/manifest-item.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { GroupsService } from '../groups/groups.service';
import { IFileAccessService } from '../file-access/file-access.service';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { FileNotFoundException } from '../storage/exceptions/file-not-found.exception';
import { FileTooLargeException } from '../storage/exceptions/file-too-large.exception';
import { InvalidFileTypeException } from '../storage/exceptions/invalid-file-type.exception';
import { StorageService } from '../storage/storage.service';
import { WebSocketService } from '../websocket/websocket.service';
import { TextExtractorService } from '../text-extractor/text-extractor.service';
import { UpdateManifestDto } from './dto/update-manifest.dto';
import { ManifestNotFoundException } from './exceptions/manifest-not-found.exception';
import { detectFileType } from './interceptors/pdf-file.interceptor';
import { DynamicFieldFiltersDto } from './dto/dynamic-field-filters.dto';
import {
  assertValidJsonPath,
  buildJsonPathQuery,
} from './utils/json-path.util';
import { OcrResultDto } from './dto/ocr-result.dto';
import { OcrContextPreviewDto } from './dto/re-extract-field-preview.dto';
import { ManifestExtractionHistoryEntryDto } from './dto/manifest-extraction-history.dto';
import { ManifestExtractionHistoryEntryDetailsDto } from './dto/manifest-extraction-history-details.dto';

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
  private readonly logger = new Logger(ManifestsService.name);

  constructor(
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
    @InjectRepository(ManifestItemEntity)
    private readonly manifestItemRepository: Repository<ManifestItemEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
    private readonly groupsService: GroupsService,
    private readonly storageService: StorageService,
    private readonly textExtractorService: TextExtractorService,
    private readonly webSocketService: WebSocketService,
    @Inject('IFileAccessService')
    private readonly fileSystem: IFileAccessService,
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

  async findItems(
    user: UserEntity,
    manifestId: number,
  ): Promise<ManifestItemEntity[]> {
    await this.findOne(user, manifestId);
    return this.manifestItemRepository.find({
      where: { manifestId },
      order: { id: 'ASC' },
    });
  }

  async findManyByIds(
    user: UserEntity,
    ids: number[],
  ): Promise<ManifestEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const manifests = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoinAndSelect('manifest.group', 'group')
      .leftJoinAndSelect('group.project', 'project')
      .where('manifest.id IN (:...ids)', { ids })
      .getMany();

    const foundIds = new Set(manifests.map((manifest) => manifest.id));
    const missing = ids.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new ManifestNotFoundException(missing[0]);
    }

    if (user.role !== UserRole.ADMIN) {
      for (const manifest of manifests) {
        if (manifest.group.project.ownerId !== user.id) {
          throw new ProjectOwnershipException(manifest.group.projectId);
        }
      }
    }

    return manifests;
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

  async listExtractionHistory(
    user: UserEntity,
    manifestId: number,
    options: { limit?: number } = {},
  ): Promise<ManifestExtractionHistoryEntryDto[]> {
    await this.findOne(user, manifestId);

    const limit = this.normalizeHistoryLimit(options.limit);

    const jobs = await this.jobRepository.find({
      where: { manifestId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const modelIds = Array.from(
      new Set(
        jobs
          .map((job) => job.llmModelId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const promptIds = Array.from(
      new Set(
        jobs
          .map((job) => job.promptId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );

    const [models, prompts] = await Promise.all([
      modelIds.length > 0
        ? this.modelRepository.find({ where: { id: In(modelIds) } })
        : Promise.resolve([]),
      promptIds.length > 0
        ? this.promptRepository.find({ where: { id: In(promptIds) } })
        : Promise.resolve([]),
    ]);

    const modelNameById = new Map(models.map((model) => [model.id, model.name]));
    const promptNameById = new Map(prompts.map((prompt) => [prompt.id, prompt.name]));

    return jobs.map((job) =>
      ManifestExtractionHistoryEntryDto.fromEntity(job, {
        llmModelName: job.llmModelId ? modelNameById.get(job.llmModelId) : null,
        promptName: job.promptId ? promptNameById.get(job.promptId) : null,
      }),
    );
  }

  async getExtractionHistoryEntry(
    user: UserEntity,
    manifestId: number,
    jobId: number,
  ): Promise<ManifestExtractionHistoryEntryDetailsDto> {
    await this.findOne(user, manifestId);

    const job = await this.jobRepository.findOne({
      where: { id: jobId, manifestId },
    });
    if (!job) {
      throw new NotFoundException(`Extraction job ${jobId} not found for manifest ${manifestId}`);
    }

    const [model, prompt] = await Promise.all([
      job.llmModelId ? this.modelRepository.findOne({ where: { id: job.llmModelId } }) : Promise.resolve(null),
      job.promptId ? this.promptRepository.findOne({ where: { id: job.promptId } }) : Promise.resolve(null),
    ]);

    return ManifestExtractionHistoryEntryDetailsDto.fromEntity(job, {
      llmModelName: model?.name ?? null,
      promptName: prompt?.name ?? null,
      promptTemplateContent: prompt?.content ?? null,
    });
  }

  private normalizeHistoryLimit(limit?: number): number {
    const resolved = limit ?? 25;
    if (resolved < 1) {
      return 1;
    }
    return Math.min(resolved, 100);
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

  async getOcrResult(
    user: UserEntity,
    id: number,
  ): Promise<OcrResultDto | null> {
    const manifest = await this.findOne(user, id);
    return (manifest.ocrResult as OcrResultDto | null) ?? null;
  }

  async processOcrForManifest(
    manifest: ManifestEntity,
    options: { force?: boolean; textExtractorId?: string } = {},
  ): Promise<OcrResultDto> {
    if (manifest.ocrResult && !options.force) {
      return manifest.ocrResult as unknown as OcrResultDto;
    }

    const extractorId =
      options.textExtractorId ?? manifest.group?.project?.textExtractorId ?? null;
    if (!extractorId) {
      throw new BadRequestException('Text extractor is required for OCR preview');
    }

    const fileBuffer = await this.fileSystem.readFile(manifest.storagePath);
    const { result } = await this.textExtractorService.extract(extractorId, {
      buffer: fileBuffer,
      fileType: manifest.fileType,
      filePath: manifest.storagePath,
      originalFilename: manifest.originalFilename,
    });

    const cachedResult = result.metadata.ocrResult;
    if (!cachedResult) {
      throw new BadRequestException('Text extractor did not return OCR result');
    }

    manifest.ocrResult = cachedResult as unknown as Record<string, unknown>;
    manifest.ocrProcessedAt = new Date(
      cachedResult.metadata?.processedAt ?? new Date().toISOString(),
    );
    manifest.ocrQualityScore = result.metadata.qualityScore ?? null;
    manifest.textExtractorId = extractorId;

    await this.manifestRepository.save(manifest);
    this.webSocketService.emitOcrUpdate({
      manifestId: manifest.id,
      hasOcr: true,
      qualityScore: manifest.ocrQualityScore ?? null,
      processedAt: manifest.ocrProcessedAt ?? null,
    });
    return cachedResult;
  }

  buildOcrContextPreview(
    manifest: ManifestEntity,
    fieldName: string,
  ): OcrContextPreviewDto | undefined {
    const ocrResult = manifest.ocrResult as OcrResultDto | null;
    if (!ocrResult || !Array.isArray(ocrResult.pages)) {
      return undefined;
    }

    const rawField = fieldName.split('.').pop() ?? fieldName;
    const normalizedField = rawField.replace(/_/g, ' ').toLowerCase();
    const candidates = [normalizedField, rawField.toLowerCase()];

    for (const page of ocrResult.pages) {
      const text = page.text ?? '';
      const lower = text.toLowerCase();
      const matchIndex = candidates
        .map((term) => lower.indexOf(term))
        .find((index) => index >= 0);

      if (matchIndex !== undefined && matchIndex >= 0) {
        const start = Math.max(0, matchIndex - 120);
        const end = Math.min(text.length, matchIndex + 180);
        return {
          fieldName,
          snippet: text.slice(start, end).trim(),
          pageNumber: page.pageNumber,
          confidence: page.confidence,
        };
      }
    }

    const fallbackText = ocrResult.pages
      .map((page) => page.text ?? '')
      .join('\n')
      .trim();

    if (!fallbackText) {
      return undefined;
    }

    return {
      fieldName,
      snippet: fallbackText.slice(0, 300),
      pageNumber: ocrResult.pages[0]?.pageNumber,
      confidence: ocrResult.pages[0]?.confidence,
    };
  }

  async backfillOcrResults(options?: {
    limit?: number;
    concurrency?: number;
  }): Promise<{ processed: number; skipped: number }> {
    const limit = Math.min(options?.limit ?? 25, 200);
    const concurrency = Math.max(1, options?.concurrency ?? 2);

    const manifests = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoinAndSelect('manifest.group', 'group')
      .leftJoinAndSelect('group.project', 'project')
      .where('manifest.extractedData IS NOT NULL')
      .andWhere('manifest.ocrResult IS NULL')
      .take(limit)
      .getMany();

    let processed = 0;
    let skipped = 0;
    const queue = [...manifests];

    const workers = Array.from({ length: concurrency }).map(async () => {
      while (queue.length > 0) {
        const target = queue.shift();
        if (!target) {
          return;
        }
        try {
          await this.processOcrForManifest(target, { force: true });
          processed += 1;
        } catch (error) {
          skipped += 1;
          this.logger.warn(
            `Failed to backfill OCR for manifest ${target.id}: ${this.formatError(error)}`,
          );
        }
      }
    });

    await Promise.all(workers);
    return { processed, skipped };
  }

  async createJob(
    manifestId: number,
    queueJobId: string,
    llmModelId?: string,
    promptId?: number,
    estimatedCost?: number,
  ): Promise<JobEntity> {
    await this.findById(manifestId);
    const job = this.jobRepository.create({
      manifestId,
      queueJobId,
      status: JobStatus.PENDING,
      llmModelId: llmModelId ?? null,
      promptId: promptId ?? null,
      progress: 0,
      estimatedCost: estimatedCost ?? null,
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
    cost?: {
      total?: number;
      text?: number;
      llm?: number;
      textExtractorId?: string;
      pagesProcessed?: number;
      llmInputTokens?: number;
      llmOutputTokens?: number;
    },
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
    if (cost?.total !== undefined) {
      job.actualCost = cost.total;
    }
    if (cost?.text !== undefined) {
      job.ocrActualCost = cost.text;
    }
    if (cost?.llm !== undefined) {
      job.llmActualCost = cost.llm;
    }
    if (cost?.pagesProcessed !== undefined) {
      job.pagesProcessed = cost.pagesProcessed;
    }
    if (cost?.llmInputTokens !== undefined) {
      job.llmInputTokens = cost.llmInputTokens;
    }
    if (cost?.llmOutputTokens !== undefined) {
      job.llmOutputTokens = cost.llmOutputTokens;
    }
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

  async updateJobPromptSnapshot(
    queueJobId: string,
    systemPrompt: string | null,
    userPrompt: string | null,
  ): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { queueJobId },
    });
    if (!job) {
      return null;
    }

    job.systemPrompt = systemPrompt;
    job.userPrompt = userPrompt;

    return this.jobRepository.save(job);
  }

  async updateJobAssistantResponse(
    queueJobId: string,
    assistantResponse: string,
  ): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { queueJobId },
    });
    if (!job) {
      return null;
    }

    job.assistantResponse = assistantResponse;
    return this.jobRepository.save(job);
  }

  async requestJobCancel(
    queueJobId: string,
    reason?: string,
  ): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { queueJobId },
    });
    if (!job) {
      return null;
    }

    if (!job.cancelRequestedAt) {
      job.cancelRequestedAt = new Date();
    }
    if (reason !== undefined) {
      job.cancelReason = reason || null;
    }

    return this.jobRepository.save(job);
  }

  async getJobCancelRequest(queueJobId: string): Promise<{ requested: boolean; reason?: string }> {
    const job = await this.jobRepository.findOne({
      where: { queueJobId },
      select: ['cancelRequestedAt', 'cancelReason'],
    });

    return {
      requested: Boolean(job?.cancelRequestedAt),
      reason: job?.cancelReason ?? undefined,
    };
  }

  async markJobCanceled(
    queueJobId: string,
    reason?: string,
    attemptCount?: number,
  ): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { queueJobId },
    });
    if (!job) {
      return null;
    }

    const message = reason ? `Canceled: ${reason}` : 'Canceled';

    job.status = JobStatus.FAILED;
    job.error = message;
    job.canceledAt = new Date();
    job.completedAt = new Date();
    if (!job.startedAt) {
      job.startedAt = new Date();
    }
    if (!job.cancelRequestedAt) {
      job.cancelRequestedAt = new Date();
    }
    if (job.cancelReason === null || job.cancelReason === undefined) {
      job.cancelReason = reason ?? null;
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

    const ocrQualityMin = filters.ocrQualityMin;
    const ocrQualityMax = filters.ocrQualityMax;
    const wantsUnprocessed =
      ocrQualityMin === 0 &&
      ocrQualityMax === 0 &&
      ocrQualityMin !== undefined &&
      ocrQualityMax !== undefined;

    if (wantsUnprocessed) {
      query.andWhere(
        '(manifest.ocrQualityScore IS NULL OR manifest.ocrQualityScore = 0)',
      );
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
      query.andWhere('manifest.extractionCost >= :costMin', {
        costMin: filters.costMin,
      });
    }

    if (filters.costMax !== undefined) {
      query.andWhere('manifest.extractionCost <= :costMax', {
        costMax: filters.costMax,
      });
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
          query.andWhere('manifest.extractedData IS NOT NULL');
          query.andWhere(`${errorCountExpr} = 0`);
          break;
        case 'partial':
          query.andWhere('manifest.status = :statusCompleted', {
            statusCompleted: ManifestStatus.COMPLETED,
          });
          query.andWhere('manifest.extractedData IS NOT NULL');
          query.andWhere(`${errorCountExpr} > 0`);
          break;
        default:
          break;
      }
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
