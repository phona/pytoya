import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OperationLogEntity } from '../entities/operation-log.entity';
import type { ManifestEntity } from '../entities/manifest.entity';
import type { UserEntity } from '../entities/user.entity';
import type { UpdateManifestDto } from '../manifests/dto/update-manifest.dto';
import { ManifestsService } from '../manifests/manifests.service';
import { computeJsonDiff } from '../manifests/utils/json-diff.util';

/** How many unchecked corrections before we nudge the user to update prompt rules */
const CORRECTION_FEEDBACK_THRESHOLD = 10;

export interface UpdateManifestResult {
  manifest: ManifestEntity;
  correctionFeedbackAvailable: boolean;
}

@Injectable()
export class UpdateManifestUseCase {
  private readonly logger = new Logger(UpdateManifestUseCase.name);

  constructor(
    private readonly manifestsService: ManifestsService,
    @InjectRepository(OperationLogEntity)
    private readonly operationLogRepository: Repository<OperationLogEntity>,
  ) {}

  async update(user: UserEntity, manifestId: number, body: UpdateManifestDto): Promise<UpdateManifestResult> {
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
    let didLogManualEdit = false;
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
          didLogManualEdit = true;
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

    // Check if accumulated corrections warrant a prompt rules update
    let correctionFeedbackAvailable = false;
    if (didLogManualEdit) {
      correctionFeedbackAvailable = await this.checkCorrectionThreshold(updated);
    }

    return { manifest: updated, correctionFeedbackAvailable };
  }

  /**
   * Check if the number of manual_edit logs since the last schema update
   * exceeds the feedback threshold.
   */
  private async checkCorrectionThreshold(manifest: ManifestEntity): Promise<boolean> {
    try {
      // Count recent manual_edit logs for this manifest's project
      // We check per-project (all manifests in the same project's groups)
      const count = await this.operationLogRepository
        .createQueryBuilder('log')
        .innerJoin('log.manifest', 'm')
        .innerJoin('m.group', 'g')
        .where('g.project_id = (SELECT g2.project_id FROM groups g2 WHERE g2.id = :groupId)', {
          groupId: manifest.groupId,
        })
        .andWhere('log.action = :action', { action: 'manual_edit' })
        .getCount();

      // Feedback available at every THRESHOLD interval (10, 20, 30, ...)
      return count > 0 && count % CORRECTION_FEEDBACK_THRESHOLD === 0;
    } catch (error) {
      this.logger.warn(`Failed to check correction threshold: ${error}`);
      return false;
    }
  }
}
