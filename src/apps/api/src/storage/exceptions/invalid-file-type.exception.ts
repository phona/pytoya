import { BadRequestException } from '@nestjs/common';

export class InvalidFileTypeException extends BadRequestException {
  constructor() {
    super('Only PDF files are allowed');
  }
}
