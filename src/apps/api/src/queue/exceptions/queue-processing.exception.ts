import { InternalServerErrorException } from '@nestjs/common';

export class QueueProcessingException extends InternalServerErrorException {
  constructor(message: string) {
    super(message);
  }
}
