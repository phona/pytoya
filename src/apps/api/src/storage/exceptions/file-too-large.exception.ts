import { PayloadTooLargeException } from '@nestjs/common';

export class FileTooLargeException extends PayloadTooLargeException {
  constructor() {
    super('File size exceeds 50MB limit');
  }
}
