import { BadRequestException } from '@nestjs/common';

export class ScriptSyntaxException extends BadRequestException {
  constructor(message: string) {
    super(`Script syntax error: ${message}`);
  }
}
