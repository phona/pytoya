import { BadRequestException, Injectable } from '@nestjs/common';

import type { UserEntity } from '../entities/user.entity';
import type { UpdateManifestDto } from '../manifests/dto/update-manifest.dto';
import { ManifestsService } from '../manifests/manifests.service';

@Injectable()
export class UpdateManifestUseCase {
  constructor(private readonly manifestsService: ManifestsService) {}

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

    const { allowValidationErrors: _allowValidationErrors, ...bodyWithoutOverrides } = body;

    const isEditingData =
      bodyWithoutOverrides.extractedData !== undefined ||
      bodyWithoutOverrides.purchaseOrder !== undefined ||
      bodyWithoutOverrides.invoiceDate !== undefined ||
      bodyWithoutOverrides.department !== undefined;
    const shouldResetHumanVerified =
      isEditingData && bodyWithoutOverrides.humanVerified === undefined && manifest.humanVerified;

    const nextBody: UpdateManifestDto =
      shouldResetHumanVerified ? { ...bodyWithoutOverrides, humanVerified: false } : bodyWithoutOverrides;

    return this.manifestsService.update(user, manifestId, nextBody);
  }
}
