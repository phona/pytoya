import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ManifestItemEntity } from '../entities/manifest-item.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { GroupsService } from '../groups/groups.service';
import { TextExtractorService } from '../text-extractor/text-extractor.service';
import { StorageService } from '../storage/storage.service';
import { WebSocketService } from '../websocket/websocket.service';
import { ManifestsService } from './manifests.service';

const createQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
});

describe('ManifestsService', () => {
  let service: ManifestsService;
  let manifestRepository: jest.Mocked<Repository<ManifestEntity>>;
  let jobRepository: jest.Mocked<Repository<JobEntity>>;
  let groupsService: jest.Mocked<GroupsService>;
  let queryBuilder: ReturnType<typeof createQueryBuilder>;

  beforeEach(async () => {
    queryBuilder = createQueryBuilder();

    manifestRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<ManifestEntity>>;

    jobRepository = {} as jest.Mocked<Repository<JobEntity>>;

    groupsService = {
      findOne: jest.fn().mockResolvedValue({ id: 1, projectId: 1 }),
    } as unknown as jest.Mocked<GroupsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManifestsService,
        { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepository },
        { provide: getRepositoryToken(ManifestItemEntity), useValue: {} },
        { provide: getRepositoryToken(JobEntity), useValue: jobRepository },
        { provide: getRepositoryToken(ModelEntity), useValue: {} },
        { provide: getRepositoryToken(PromptEntity), useValue: {} },
        { provide: GroupsService, useValue: groupsService },
        { provide: StorageService, useValue: {} },
        { provide: TextExtractorService, useValue: {} },
        { provide: WebSocketService, useValue: {} },
        { provide: 'IFileAccessService', useValue: {} },
      ],
    }).compile();

    service = module.get<ManifestsService>(ManifestsService);
  });

  it('applies jsonb filters and pagination', async () => {
    await service.findByGroup({ id: 1 } as any, 1, {
      filter: { 'invoice.po_no': '123' },
      page: 2,
      pageSize: 10,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "manifest.extractedData -> 'invoice' ->> 'po_no' ILIKE :filterValue0",
      { filterValue0: '%123%' },
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
  });

  it('sorts by mapped columns', async () => {
    await service.findByGroup({ id: 1 } as any, 1, {
      sortBy: 'filename',
      order: 'desc',
    });

    expect(queryBuilder.orderBy).toHaveBeenCalledWith('manifest.filename', 'DESC');
  });

  it('sorts by jsonb fields with numeric hint', async () => {
    await service.findByGroup({ id: 1 } as any, 1, {
      sortBy: 'invoice.po_no',
      order: 'asc',
    });

    const [orderByExpression] = queryBuilder.orderBy.mock.calls[0];
    expect(orderByExpression).toContain('CASE WHEN');
    expect(orderByExpression).toContain("manifest.extractedData -> 'invoice' ->> 'po_no'");
  });

  it('rejects invalid field paths', async () => {
    await expect(
      service.findByGroup({ id: 1 } as any, 1, {
        filter: { 'invoice..po_no': '123' },
      }),
    ).rejects.toThrow('Invalid field path');
  });

  it('maps status filter to manifest column', async () => {
    await service.findByGroup({ id: 1 } as any, 1, {
      filter: { status: 'completed' },
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'manifest.status = :statusFilter',
      { statusFilter: 'completed' },
    );
  });
});
