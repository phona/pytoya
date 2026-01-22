import { NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class FileNotFoundException extends NotFoundException {
  constructor() {
    super({ code: ERROR_CODES.FILE_NOT_FOUND, message: 'File not found' });
  }
}
