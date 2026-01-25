import { Injectable } from '@nestjs/common';

import type { UserEntity } from '../entities/user.entity';
import { FileNotFoundException } from '../storage/exceptions/file-not-found.exception';
import { ManifestsService } from '../manifests/manifests.service';

@Injectable()
export class UploadManifestsUseCase {
  constructor(private readonly manifestsService: ManifestsService) {}

  async uploadSingle(
    user: UserEntity,
    groupId: number,
    file: Express.Multer.File | undefined,
  ) {
    return this.manifestsService.create(user, groupId, file);
  }

  async uploadBatch(
    user: UserEntity,
    groupId: number,
    files: Express.Multer.File[] | undefined,
  ) {
    if (!files || files.length === 0) {
      throw new FileNotFoundException();
    }

    return Promise.all(
      files.map((file) => this.manifestsService.create(user, groupId, file)),
    );
  }
}
