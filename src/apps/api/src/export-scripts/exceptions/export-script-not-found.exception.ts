import { NotFoundException } from '@nestjs/common';

export class ExportScriptNotFoundException extends NotFoundException {
  constructor(id: number) {
    super(`Export script ${id} not found`);
  }
}

