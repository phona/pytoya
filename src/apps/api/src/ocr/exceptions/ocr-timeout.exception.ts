import { GatewayTimeoutException } from '@nestjs/common';

export class OcrTimeoutException extends GatewayTimeoutException {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'OcrTimeoutException';
    this.originalError = originalError;
  }
}
