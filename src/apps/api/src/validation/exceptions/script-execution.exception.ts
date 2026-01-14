import { BadRequestException } from '@nestjs/common';

export class ScriptExecutionException extends BadRequestException {
  constructor(message: string) {
    super(`Script execution error: ${message}`);
  }
}
