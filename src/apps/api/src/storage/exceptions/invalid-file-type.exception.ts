import { BadRequestException } from '@nestjs/common';

export class InvalidFileTypeException extends BadRequestException {
  constructor() {
    super(
      'Only PDF and image files (JPEG, PNG, GIF, WebP, BMP) are allowed',
    );
  }
}
