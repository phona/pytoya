import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ManifestItemEntity } from '../entities/manifest-item.entity';
import { ModelEntity } from '../entities/model.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { SchemaEntity } from '../entities/schema.entity';
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
  let schemaRepository: jest.Mocked<Repository<SchemaEntity>>;
  let groupsService: jest.Mocked<GroupsService>;
  let storageService: { saveFile: jest.Mock };
  let queryBuilder: ReturnType<typeof createQueryBuilder>;

  beforeEach(async () => {
    queryBuilder = createQueryBuilder();

    manifestRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ManifestEntity>>;

    jobRepository = {} as jest.Mocked<Repository<JobEntity>>;

    schemaRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        jsonSchema: {
          type: 'object',
          properties: {
            invoice: {
              type: 'object',
              properties: {
                po_no: { type: 'string' },
                total_amount: { type: 'number' },
              },
            },
          },
        },
      } as any),
    } as unknown as jest.Mocked<Repository<SchemaEntity>>;

    groupsService = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 1, projectId: 1, project: { defaultSchemaId: 1 } } as any),
    } as unknown as jest.Mocked<GroupsService>;

    storageService = {
      saveFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManifestsService,
        { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepository },
        { provide: getRepositoryToken(ManifestItemEntity), useValue: {} },
        { provide: getRepositoryToken(JobEntity), useValue: jobRepository },
        { provide: getRepositoryToken(ModelEntity), useValue: {} },
        { provide: getRepositoryToken(PromptEntity), useValue: {} },
        { provide: getRepositoryToken(SchemaEntity), useValue: schemaRepository },
        { provide: GroupsService, useValue: groupsService },
        { provide: StorageService, useValue: storageService },
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

  it('sorts by jsonb string fields using lexicographic ordering', async () => {
    await service.findByGroup({ id: 1 } as any, 1, {
      sortBy: 'invoice.po_no',
      order: 'asc',
    });

    const [orderByExpression] = queryBuilder.orderBy.mock.calls[0];
    expect(orderByExpression).toContain("manifest.extractedData -> 'invoice' ->> 'po_no'");
  });

  it('sorts by jsonb numeric fields using numeric ordering', async () => {
    await service.findByGroup({ id: 1 } as any, 1, {
      sortBy: 'invoice.total_amount',
      order: 'desc',
    });

    const [orderByExpression] = queryBuilder.orderBy.mock.calls[0];
    expect(orderByExpression).toContain('CASE WHEN');
    expect(orderByExpression).toContain('::numeric');
    expect(orderByExpression).toContain("manifest.extractedData -> 'invoice' ->> 'total_amount'");
  });

  it('filters jsonb numeric fields using numeric comparisons', async () => {
    await service.findByGroup({ id: 1 } as any, 1, {
      filter: { 'invoice.total_amount': '100' },
    });

    const [whereExpression, params] = queryBuilder.andWhere.mock.calls.find((call) =>
      String(call[0]).includes('::numeric'),
    ) as any;
    expect(whereExpression).toContain('= :filterValue0');
    expect(params).toEqual({ filterValue0: 100 });
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

  it('returns existing manifest as duplicate when content hash matches', async () => {
    const existing = { id: 123, groupId: 1 } as any;
    manifestRepository.findOne.mockResolvedValueOnce(existing);

    const result = await service.create(
      { id: 1 } as any,
      1,
      {
        mimetype: 'application/pdf',
        buffer: Buffer.from('same'),
        size: 10,
        originalname: 'invoice.pdf',
      } as any,
    );

    expect(result).toEqual({ manifest: existing, isDuplicate: true });
    expect(storageService.saveFile).not.toHaveBeenCalled();
    expect(manifestRepository.save).not.toHaveBeenCalled();
  });

  it('creates a new manifest when content is new', async () => {
    manifestRepository.findOne.mockResolvedValueOnce(null);
    storageService.saveFile.mockResolvedValueOnce({
      filename: 'stored.pdf',
      originalFilename: 'invoice.pdf',
      storagePath: '/stored.pdf',
      fileSize: 10,
    });

    const created = { id: 999 } as any;
    manifestRepository.create.mockReturnValueOnce(created);
    manifestRepository.save.mockResolvedValueOnce(created);

    const result = await service.create(
      { id: 1 } as any,
      1,
      {
        mimetype: 'application/pdf',
        buffer: Buffer.from('new'),
        size: 10,
        originalname: 'invoice.pdf',
      } as any,
    );

    expect(result).toEqual({ manifest: created, isDuplicate: false });
    expect(storageService.saveFile).toHaveBeenCalled();
    expect(manifestRepository.save).toHaveBeenCalledWith(created);
  });

  it('treats unique constraint race as duplicate', async () => {
    manifestRepository.findOne
      .mockResolvedValueOnce(null) // first existence check
      .mockResolvedValueOnce({ id: 555, groupId: 1 } as any); // raced re-check

    storageService.saveFile.mockResolvedValueOnce({
      filename: 'stored.pdf',
      originalFilename: 'invoice.pdf',
      storagePath: '/stored.pdf',
      fileSize: 10,
    });

    manifestRepository.create.mockReturnValueOnce({} as any);
    manifestRepository.save.mockRejectedValueOnce(new Error('unique_violation'));

    const result = await service.create(
      { id: 1 } as any,
      1,
      {
        mimetype: 'application/pdf',
        buffer: Buffer.from('race'),
        size: 10,
        originalname: 'invoice.pdf',
      } as any,
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.manifest.id).toBe(555);
  });
});
