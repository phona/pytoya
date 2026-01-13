import { NotFoundException } from '@nestjs/common';

export class FileNotFoundException extends NotFoundException {
  constructor() {
    super('File not found');
  }
}
