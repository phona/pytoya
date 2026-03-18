import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OperationLogEntity } from '../entities/operation-log.entity';
import type { UserEntity } from '../entities/user.entity';
import type { UpdateManifestDto } from '../manifests/dto/update-manifest.dto';
import { ManifestsService } from '../manifests/manifests.service';
import { computeJsonDiff } from '../manifests/utils/json-diff.util';

@Injectable()
export class UpdateManifestUseCase {
  constructor(
    private readonly manifestsService: ManifestsService,
    @InjectRepository(OperationLogEntity)
    private readonly operationLogRepository: Repository<OperationLogEntity>,
  ) {}

  async update(user: UserEntity, manifestId: number, body: UpdateManifestDto) {
    const manifest = await this.manifestsService.findOne(user, manifestId);

    if (body.humanVerified === true) {
      const errorCount = manifest.validationResults?.errorCount ?? 0;
      if (errorCount > 0 && body.allowValidationErrors !== true) {
        throw new BadRequestException({
          code: 'MANIFEST_VALIDATION_FAILED',
          message: 'Cannot mark manifest as human verified while validation errors exist.',
          params: { errorCount },
        });
      }
    }

    const { allowValidationErrors: _allowValidationErrors, saveSource, ...bodyWithoutOverrides } = body;

    const isEditingData =
      bodyWithoutOverrides.extractedData !== undefined ||
      bodyWithoutOverrides.purchaseOrder !== undefined ||
      bodyWithoutOverrides.invoiceDate !== undefined ||
      bodyWithoutOverrides.department !== undefined;
    const shouldResetHumanVerified =
      isEditingData && bodyWithoutOverrides.humanVerified === undefined && manifest.humanVerified;

    const nextBody: UpdateManifestDto =
      shouldResetHumanVerified ? { ...bodyWithoutOverrides, humanVerified: false } : bodyWithoutOverrides;

    // Capture old data for diff computation before the update
    const oldExtractedData = manifest.extractedData;
    const oldHumanVerified = manifest.humanVerified;

    const updated = await this.manifestsService.update(user, manifestId, nextBody);

    // Log operation on explicit saves
    if (saveSource === 'explicit') {
      if (bodyWithoutOverrides.extractedData !== undefined) {
        const diffs = computeJsonDiff(oldExtractedData, bodyWithoutOverrides.extractedData);
        if (diffs.length > 0) {
          const log = this.operationLogRepository.create({
            manifestId,
            userId: user.id,
            action: 'manual_edit',
            diffs,
          });
          await this.operationLogRepository.save(log);
        }
      }
    }

    // Log humanVerified transitions (regardless of saveSource)
    if (!oldHumanVerified && updated.humanVerified) {
      const log = this.operationLogRepository.create({
        manifestId,
        userId: user.id,
        action: 'human_verified',
        diffs: [],
      });
      await this.operationLogRepository.save(log);
    }

    return updated;
  }
}
