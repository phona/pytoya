import { PayloadTooLargeException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class FileTooLargeException extends PayloadTooLargeException {
  constructor() {
    super({
      code: ERROR_CODES.FILE_TOO_LARGE,
      message: 'File size exceeds 50MB limit',
    });
  }
}
