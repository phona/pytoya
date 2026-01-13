import { NotFoundException } from '@nestjs/common';

export class GroupNotFoundException extends NotFoundException {
  constructor(groupId: number) {
    super(`Group ${groupId} not found`);
  }
}
