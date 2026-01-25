import { ConfigService } from '@nestjs/config';
import * as path from 'path';

import { StorageService } from './storage.service';

describe('StorageService', () => {
  it('builds public uploads URL under /api/uploads by default', () => {
    const configService = {
      get: () => undefined,
    } as unknown as ConfigService;

    const service = new StorageService(configService);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const filepath = path.join(
      uploadsRoot,
      'projects',
      '1',
      'groups',
      '1',
      'manifests',
      'file.pdf',
    );

    expect(service.getPublicPath(filepath)).toBe(
      '/api/uploads/projects/1/groups/1/manifests/file.pdf',
    );
  });

  it('prefixes public uploads URL with server.basePath', () => {
    const configService = {
      get: () => '/pytoya',
    } as unknown as ConfigService;

    const service = new StorageService(configService);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const filepath = path.join(
      uploadsRoot,
      'projects',
      '1',
      'groups',
      '1',
      'manifests',
      'file.pdf',
    );

    expect(service.getPublicPath(filepath)).toBe(
      '/pytoya/api/uploads/projects/1/groups/1/manifests/file.pdf',
    );
  });
});

