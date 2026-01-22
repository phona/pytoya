import { ForbiddenException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class ProjectOwnershipException extends ForbiddenException {
  constructor(projectId: number) {
    super({
      code: ERROR_CODES.PROJECT_FORBIDDEN,
      message: 'Access denied',
      params: { projectId },
    });
  }
}
