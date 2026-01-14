import { NotFoundException } from '@nestjs/common';

export class SchemaNotFoundException extends NotFoundException {
  constructor(id: number) {
    super(`Schema with ID ${id} not found`);
  }
}
