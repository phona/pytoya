import { ServiceUnavailableException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class OcrServiceException extends ServiceUnavailableException {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super({ code: ERROR_CODES.OCR_SERVICE_ERROR, message });
    this.name = 'OcrServiceException';
    this.originalError = originalError;
  }
}
