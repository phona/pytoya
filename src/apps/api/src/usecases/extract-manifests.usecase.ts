import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { UserEntity } from '../entities/user.entity';
import { ManifestsService } from '../manifests/manifests.service';
import type { ExtractDto } from '../manifests/dto/extract.dto';
import type { BulkExtractDto } from '../manifests/dto/bulk-extract.dto';
import type { ExtractFilteredDto } from '../manifests/dto/extract-filtered.dto';
import type { ExtractFilteredResponseDto } from '../manifests/dto/extract-filtered-response.dto';
import type { ReExtractFieldDto } from '../manifests/dto/re-extract-field.dto';
import type {
  ReExtractFieldPreviewDto,
  ReExtractFieldPreviewResponseDto,
} from '../manifests/dto/re-extract-field-preview.dto';
import { GroupsService } from '../groups/groups.service';
import type {
  ExtractionJobRequest,
  JobQueuePort,
} from '../ports/job-queue.port';
import { JOB_QUEUE_PORT } from '../ports/job-queue.port';

@Injectable()
export class ExtractManifestsUseCase {
  constructor(
    private readonly manifestsService: ManifestsService,
    private readonly groupsService: GroupsService,
    @Inject(JOB_QUEUE_PORT) private readonly jobQueue: JobQueuePort,
  ) {}

  async extractSingle(user: UserEntity, manifestId: number, body: ExtractDto) {
    const manifest = await this.manifestsService.findOne(user, manifestId);
    const resolvedLlmModelId =
      body.llmModelId ?? manifest.group?.project?.llmModelId ?? undefined;

    const request: ExtractionJobRequest = {
      manifestId,
      llmModelId: resolvedLlmModelId,
      promptId: body.promptId,
    };
    const jobId = await this.jobQueue.enqueueExtractionJob(request);
    return { jobId };
  }

  async extractBulk(user: UserEntity, body: BulkExtractDto) {
    const manifests = await this.manifestsService.findManyByIds(
      user,
      body.manifestIds,
    );
    const resolvedLlmModelId =
      body.llmModelId ?? manifests[0]?.group?.project?.llmModelId ?? undefined;
    const jobIds = await Promise.all(
      manifests.map((manifest) =>
        this.jobQueue.enqueueExtractionJob({
          manifestId: manifest.id,
          llmModelId: resolvedLlmModelId,
          promptId: body.promptId,
        }),
      ),
    );

    const jobs = jobIds.map((jobId, index) => ({
      jobId,
      manifestId: manifests[index].id,
    }));
    const batchId = `batch_${Date.now()}_${jobIds.length}`;

    return {
      jobId: batchId,
      jobIds,
      jobs,
      manifestCount: manifests.length,
    };
  }

  async extractFiltered(
    user: UserEntity,
    groupId: number,
    body: ExtractFilteredDto,
  ): Promise<ExtractFilteredResponseDto> {
    const group = await this.groupsService.findOne(user, groupId);
    const resolvedLlmModelId =
      body.llmModelId ?? group.project?.llmModelId ?? undefined;

    const manifests = await this.manifestsService.findForFilteredExtraction(
      user,
      groupId,
      body.filters,
      body.behavior,
    );

    if (body.textExtractorId) {
      await this.manifestsService.setTextExtractorForManifests(
        user,
        groupId,
        manifests.map((m) => m.id),
        body.textExtractorId,
      );
    }

    const jobIds = await Promise.all(
      manifests.map((manifest) =>
        this.jobQueue.enqueueExtractionJob({
          manifestId: manifest.id,
          llmModelId: resolvedLlmModelId,
          promptId: body.promptId,
        }),
      ),
    );

    const jobs = jobIds.map((jobId, index) => ({
      jobId,
      manifestId: manifests[index].id,
    }));
    const batchId = `batch_${Date.now()}_${jobIds.length}`;

    return {
      jobId: batchId,
      jobIds,
      jobs,
      manifestCount: manifests.length,
    };
  }

  async reExtract(user: UserEntity, manifestId: number, body: ReExtractFieldDto) {
    await this.manifestsService.findOne(user, manifestId);
    const jobId = await this.jobQueue.enqueueExtractionJob({
      manifestId,
      llmModelId: body.llmModelId,
      promptId: body.promptId,
      fieldName: body.fieldName,
    });
    return { jobId };
  }

  async reExtractField(
    user: UserEntity,
    manifestId: number,
    body: ReExtractFieldPreviewDto,
  ): Promise<ReExtractFieldPreviewResponseDto> {
    const manifest = await this.manifestsService.findOne(user, manifestId);

    if (!manifest.ocrResult) {
      throw new BadRequestException(
        'OCR result is required. Run extraction first.',
      );
    }

    const includeOcrContext = body.includeOcrContext !== false;
    const ocrPreview = this.manifestsService.buildOcrContextPreview(
      manifest,
      body.fieldName,
    );

    if (body.previewOnly) {
      return { fieldName: body.fieldName, ocrPreview };
    }

    const jobId = await this.jobQueue.enqueueExtractionJob({
      manifestId,
      llmModelId: body.llmModelId,
      promptId: body.promptId,
      fieldName: body.fieldName,
      customPrompt: body.customPrompt,
      textContextSnippet: includeOcrContext ? ocrPreview?.snippet : undefined,
    });

    return { jobId, fieldName: body.fieldName, ocrPreview };
  }
}
