import { NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class ManifestNotFoundException extends NotFoundException {
  constructor(manifestId: number) {
    super({
      code: ERROR_CODES.MANIFEST_NOT_FOUND,
      message: 'Manifest not found',
      params: { manifestId },
    });
  }
}
