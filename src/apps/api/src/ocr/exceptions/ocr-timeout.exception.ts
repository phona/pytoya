import { GatewayTimeoutException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class OcrTimeoutException extends GatewayTimeoutException {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super({ code: ERROR_CODES.OCR_TIMEOUT, message });
    this.name = 'OcrTimeoutException';
    this.originalError = originalError;
  }
}
