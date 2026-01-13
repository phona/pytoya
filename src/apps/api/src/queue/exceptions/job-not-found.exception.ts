import { NotFoundException } from '@nestjs/common';

export class JobNotFoundException extends NotFoundException {
  constructor(jobId: string) {
    super(`Job ${jobId} not found`);
  }
}
