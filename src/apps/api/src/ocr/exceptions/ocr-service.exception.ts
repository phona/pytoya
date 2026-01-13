import { ServiceUnavailableException } from '@nestjs/common';

export class OcrServiceException extends ServiceUnavailableException {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'OcrServiceException';
    this.originalError = originalError;
  }
}
