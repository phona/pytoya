import { NotFoundException } from '@nestjs/common';

export class PromptNotFoundException extends NotFoundException {
  constructor(promptId: number | string) {
    super(`Prompt ${promptId} not found`);
  }
}
