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
      if (errorCount > 0) {
        throw new BadRequestException({
          code: 'MANIFEST_VALIDATION_FAILED',
          message: 'Cannot mark manifest as human verified while validation errors exist.',
          params: { errorCount },
        });
      }
    }

    const isEditingData =
      body.extractedData !== undefined ||
      body.purchaseOrder !== undefined ||
      body.invoiceDate !== undefined ||
      body.department !== undefined;
    const shouldResetHumanVerified =
      isEditingData && body.humanVerified === undefined && manifest.humanVerified;

    const nextBody: UpdateManifestDto =
      shouldResetHumanVerified ? { ...body, humanVerified: false } : body;

    return this.manifestsService.update(user, manifestId, nextBody);
  }
}
