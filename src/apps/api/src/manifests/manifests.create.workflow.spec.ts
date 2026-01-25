import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManifestsService } from './manifests.service';
import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { ManifestItemEntity } from '../entities/manifest-item.entity';
import { JobEntity } from '../entities/job.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { GroupsService } from '../groups/groups.service';
import { StorageService } from '../storage/storage.service';
import { TextExtractorService } from '../text-extractor/text-extractor.service';
import { WebSocketService } from '../websocket/websocket.service';
import type { IFileAccessService } from '../file-access/file-access.service';
import { UserEntity, UserRole } from '../entities/user.entity';

describe('ManifestsService.create (business workflow, no DB)', () => {
  let service: ManifestsService;
  let manifestRepository: jest.Mocked<Repository<ManifestEntity>>;
  let groupsService: jest.Mocked<GroupsService>;
  let storageService: jest.Mocked<StorageService>;

  const mockUser: UserEntity = {
    id: 1,
    username: 'test-user',
    password: 'hash',
    role: UserRole.USER,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastFailedLoginAt: null,
    projects: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    toJSON() {
      return { id: this.id, username: this.username, role: this.role };
    },
  };

  const makePdfFile = (options: { name: string; bytes: number[] }) =>
    ({
      originalname: options.name,
      mimetype: 'application/pdf',
      size: options.bytes.length,
      buffer: Buffer.from(options.bytes),
    }) as unknown as Express.Multer.File;

  beforeEach(async () => {
    manifestRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ManifestEntity>>;

    groupsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<GroupsService>;

    storageService = {
      saveFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManifestsService,
        { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepository },
        { provide: getRepositoryToken(ManifestItemEntity), useValue: {} },
        { provide: getRepositoryToken(JobEntity), useValue: {} },
        { provide: getRepositoryToken(ModelEntity), useValue: {} },
        { provide: getRepositoryToken(PromptEntity), useValue: {} },
        { provide: getRepositoryToken(SchemaEntity), useValue: { findOne: jest.fn() } },
        { provide: GroupsService, useValue: groupsService },
        { provide: StorageService, useValue: storageService },
        { provide: TextExtractorService, useValue: {} },
        { provide: WebSocketService, useValue: {} },
        { provide: 'IFileAccessService', useValue: {} satisfies Partial<IFileAccessService> },
      ],
    }).compile();

    service = module.get(ManifestsService);

    groupsService.findOne.mockResolvedValue({
      id: 1,
      name: 'Group',
      projectId: 1,
      project: null as any,
    } as any);
  });

  it('returns existing manifest and marks duplicate (no storage write)', async () => {
    const existing = {
      id: 100,
      filename: 'existing.pdf',
      originalFilename: 'existing.pdf',
      status: ManifestStatus.COMPLETED,
      groupId: 1,
      contentSha256: 'abc',
    } as unknown as ManifestEntity;

    manifestRepository.findOne.mockResolvedValue(existing);

    const file = makePdfFile({ name: 'dup.pdf', bytes: [1, 2, 3] });
    const result = await service.create(mockUser, 1, file);

    expect(result.isDuplicate).toBe(true);
    expect(result.manifest).toBe(existing);
    expect(storageService.saveFile).not.toHaveBeenCalled();
    expect(manifestRepository.save).not.toHaveBeenCalled();
  });

  it('creates a new manifest when not duplicate', async () => {
    manifestRepository.findOne.mockResolvedValue(null);

    storageService.saveFile.mockResolvedValue({
      filename: 'stored.pdf',
      originalFilename: 'new.pdf',
      storagePath: '/api/uploads/projects/1/groups/1/manifests/stored.pdf',
      fileSize: 3,
      publicPath: '/api/uploads/projects/1/groups/1/manifests/stored.pdf',
    });

    const created = { id: 0 } as unknown as ManifestEntity;
    const saved = { id: 200, filename: 'stored.pdf' } as unknown as ManifestEntity;
    manifestRepository.create.mockReturnValue(created);
    manifestRepository.save.mockResolvedValue(saved);

    const file = makePdfFile({ name: 'new.pdf', bytes: [9, 8, 7] });
    const result = await service.create(mockUser, 1, file);

    expect(result.isDuplicate).toBe(false);
    expect(result.manifest).toBe(saved);
    expect(storageService.saveFile).toHaveBeenCalledTimes(1);
    expect(manifestRepository.create).toHaveBeenCalledTimes(1);
    expect(manifestRepository.save).toHaveBeenCalledTimes(1);
  });

  it('handles unique-race by returning the raced manifest as duplicate', async () => {
    const raced = { id: 300, filename: 'raced.pdf' } as unknown as ManifestEntity;

    manifestRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raced);

    storageService.saveFile.mockResolvedValue({
      filename: 'stored.pdf',
      originalFilename: 'race.pdf',
      storagePath: '/api/uploads/projects/1/groups/1/manifests/stored.pdf',
      fileSize: 3,
      publicPath: '/api/uploads/projects/1/groups/1/manifests/stored.pdf',
    });

    manifestRepository.create.mockReturnValue({} as any);
    manifestRepository.save.mockRejectedValue(new Error('unique violation'));

    const file = makePdfFile({ name: 'race.pdf', bytes: [4, 4, 4] });
    const result = await service.create(mockUser, 1, file);

    expect(result.isDuplicate).toBe(true);
    expect(result.manifest).toBe(raced);
  });
});
