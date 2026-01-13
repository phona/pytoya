import { ForbiddenException } from '@nestjs/common';

export class ProjectOwnershipException extends ForbiddenException {
  constructor(projectId: number) {
    super(`You do not have access to project ${projectId}`);
  }
}
