import { Injectable } from '@nestjs/common';

import type { UserEntity } from '../entities/user.entity';
import { CsvExportService } from '../manifests/csv-export.service';
import { ManifestsService } from '../manifests/manifests.service';

@Injectable()
export class BulkManifestsUseCase {
  constructor(
    private readonly manifestsService: ManifestsService,
    private readonly csvExportService: CsvExportService,
  ) {}

  async deleteBulk(user: UserEntity, groupId: number, manifestIds: number[]) {
    return this.manifestsService.removeMany(user, groupId, manifestIds);
  }

  async exportBulk(user: UserEntity, manifestIds: Array<number | string>) {
    return this.csvExportService.exportCsvByManifestIds(
      user,
      manifestIds.map(String),
    );
  }
}

