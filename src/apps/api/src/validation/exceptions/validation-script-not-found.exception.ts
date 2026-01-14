import { NotFoundException } from '@nestjs/common';

export class ValidationScriptNotFoundException extends NotFoundException {
  constructor(id: number) {
    super(`Validation script with ID ${id} not found`);
  }
}
