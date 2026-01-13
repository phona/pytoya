import { NotFoundException } from '@nestjs/common';

export class ManifestNotFoundException extends NotFoundException {
  constructor(manifestId: number) {
    super(`Manifest ${manifestId} not found`);
  }
}
