import { NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class ProjectNotFoundException extends NotFoundException {
  constructor(projectId: number) {
    super({
      code: ERROR_CODES.PROJECT_NOT_FOUND,
      message: 'Project not found',
      params: { projectId },
    });
  }
}
