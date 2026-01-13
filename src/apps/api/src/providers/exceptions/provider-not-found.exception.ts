import { NotFoundException } from '@nestjs/common';

export class ProviderNotFoundException extends NotFoundException {
  constructor(providerId: number | string) {
    super(`Provider ${providerId} not found`);
  }
}
