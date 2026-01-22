import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class InvalidFileTypeException extends BadRequestException {
  constructor() {
    super(
      {
        code: ERROR_CODES.INVALID_FILE_TYPE,
        message: 'Only PDF and image files (JPEG, PNG, GIF, WebP, BMP) are allowed',
      },
    );
  }
}
