import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ModelEntity } from '../entities/model.entity';
import { CostMetricsService } from './cost-metrics.service';

describe('CostMetricsService', () => {
  let service: CostMetricsService;
  let jobRepository: jest.Mocked<Repository<JobEntity>>;
  let manifestRepository: jest.Mocked<Repository<ManifestEntity>>;
  let modelRepository: jest.Mocked<Repository<ModelEntity>>;

  beforeEach(async () => {
    jobRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<JobEntity>>;

    manifestRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ManifestEntity>>;
    modelRepository = {} as unknown as jest.Mocked<Repository<ModelEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostMetricsService,
        { provide: getRepositoryToken(JobEntity), useValue: jobRepository },
        { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepository },
        { provide: getRepositoryToken(ModelEntity), useValue: modelRepository },
      ],
    }).compile();

    service = module.get<CostMetricsService>(CostMetricsService);
  });

  it('returns dashboard metrics without Mongo-style where operators', async () => {
    // Simulate the Postgres error we see when TypeORM gets Mongo-style operators like $gte/$lt.
    jobRepository.find.mockImplementation(async (options: any) => {
      const createdAt = options?.where?.createdAt;
      if (
        createdAt &&
        typeof createdAt === 'object' &&
        ('$gte' in createdAt || '$lt' in createdAt || '$ne' in createdAt)
      ) {
        throw new Error(
          'invalid input syntax for type timestamp: "{\\"$gte\\":\\"2025-12-31T16:00:00.000Z\\"}"',
        );
      }
      return [];
    });

    const thisMonthRows = [
      {
        currency: 'USD',
        documentCount: '2',
        total: '0.3',
        ocr: '0.07',
        llm: '0.23',
      },
    ];

    const lastMonthRows = [
      {
        currency: 'USD',
        documentCount: '1',
        total: '0.3',
        ocr: '0.1',
        llm: '0.2',
      },
    ];

    let qbCall = 0;
    jobRepository.createQueryBuilder.mockImplementation(() => {
      const index = qbCall++;
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(index === 0 ? thisMonthRows : lastMonthRows),
      };
      return qb;
    });

    jest.spyOn(service, 'calculateCostAccuracy').mockResolvedValue([] as any);
    jest.spyOn(service, 'checkBudgetAlerts').mockResolvedValue([] as any);

    const result = await service.getAggregatedMetrics(1);

    expect(result.thisMonth.total).toBeCloseTo(0.3, 8);
    expect(result.thisMonth.ocr).toBeCloseTo(0.07, 8);
    expect(result.thisMonth.llm).toBeCloseTo(0.23, 8);
    expect(result.thisMonth.documentCount).toBe(2);
    expect(result.thisMonth.currency).toBe('USD');
    expect(result.lastMonth.total).toBeCloseTo(0.3, 8);
    expect(jobRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    expect(jobRepository.find).not.toHaveBeenCalled();
  });

  it('normalizes decimal-string costs for aggregated metrics totals', async () => {
    const thisMonthRows = [
      {
        currency: 'USD',
        documentCount: '2',
        total: '0.3',
        ocr: '0.07',
        llm: '0.23',
      },
    ];

    const lastMonthRows = [
      {
        currency: 'USD',
        documentCount: '1',
        total: '0.3',
        ocr: '0.1',
        llm: '0.2',
      },
    ];

    let qbCall = 0;
    jobRepository.createQueryBuilder.mockImplementation(() => {
      const index = qbCall++;
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(index === 0 ? thisMonthRows : lastMonthRows),
      };
      return qb;
    });

    jest.spyOn(service, 'calculateCostAccuracy').mockResolvedValue([] as any);
    jest.spyOn(service, 'checkBudgetAlerts').mockResolvedValue([] as any);

    const result = await service.getAggregatedMetrics(1);

    expect(typeof result.thisMonth.total).toBe('number');
    expect(typeof result.lastMonth.total).toBe('number');
    expect(result.thisMonth.total).toBeCloseTo(0.3, 8);
    expect(result.thisMonth.ocr).toBeCloseTo(0.07, 8);
    expect(result.thisMonth.llm).toBeCloseTo(0.23, 8);
  });

  it('builds budget alerts query using ProjectEntity.owner relation', async () => {
    const qb: any = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ spent: 0 }),
    };
    jobRepository.createQueryBuilder.mockReturnValue(qb);

    await service.checkBudgetAlerts(123);

    expect(qb.leftJoin).toHaveBeenCalledWith('project.owner', 'user');
    expect(qb.leftJoin).not.toHaveBeenCalledWith('project.user', expect.anything());
  });

  it('filters budget alerts by project id via joined project', async () => {
    const qb: any = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ spent: 0 }),
    };
    jobRepository.createQueryBuilder.mockReturnValue(qb);

    await service.checkBudgetAlerts(123, 456);

    expect(qb.andWhere).toHaveBeenCalledWith('project.id = :projectId', { projectId: 456 });
    expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('job.projectId'), expect.anything());
  });

  it('returns currency-grouped cost dashboard metrics with derived rates', async () => {
    const makeQb = (rows: any[]) => {
      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rows),
      };
      return qb;
    };

    const totalsRows = [
      {
        currency: 'USD',
        documentCount: '2',
        totalCost: '0.3',
        textCost: '0.07',
        llmCost: '0.23',
        pagesProcessed: '10',
        llmInputTokens: '1000',
        llmOutputTokens: '200',
      },
    ];

    const costOverTimeRows = [
      {
        date: '2026-01-13',
        currency: 'USD',
        documentCount: '2',
        totalCost: '0.3',
        textCost: '0.07',
        llmCost: '0.23',
        pagesProcessed: '10',
        llmInputTokens: '1000',
        llmOutputTokens: '200',
      },
    ];

    const llmByModelRows = [
      {
        llmModelId: 'llm-1',
        llmModelName: 'gpt-4o',
        currency: 'USD',
        documentCount: '2',
        llmCost: '0.23',
        llmInputTokens: '1000',
        llmOutputTokens: '200',
      },
    ];

    const textByExtractorRows = [
      {
        extractorId: 'ex-1',
        extractorName: 'PaddleOCR',
        currency: 'USD',
        documentCount: '2',
        textCost: '0.07',
        pagesProcessed: '10',
      },
    ];

    const qbs = [
      makeQb(totalsRows),
      makeQb(costOverTimeRows),
      makeQb(llmByModelRows),
      makeQb(textByExtractorRows),
    ];

    let call = 0;
    jobRepository.createQueryBuilder.mockImplementation(() => qbs[call++]);

    const result = await service.getCostDashboardMetrics(
      123,
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(result.dateRange).toEqual({ from: '2026-01-01', to: '2026-01-31' });
    expect(result.totalsByCurrency).toHaveLength(1);
    expect(result.totalsByCurrency[0]).toMatchObject({
      currency: 'USD',
      documentCount: 2,
      totalCost: 0.3,
      textCost: 0.07,
      llmCost: 0.23,
      pagesProcessed: 10,
      llmInputTokens: 1000,
      llmOutputTokens: 200,
    });

    expect(result.llmByModel[0].costPer1kTotalTokens).toBeCloseTo(
      (0.23 * 1000) / 1200,
      10,
    );
    expect(result.textByExtractor[0].costPerPage).toBeCloseTo(0.007, 10);

    expect(qbs[0].where).toHaveBeenCalledWith('project.ownerId = :userId', { userId: 123 });
  });

  it('builds cost-per-document trends without per-manifest job queries', async () => {
    const manifests = [
      {
        id: 1,
        filename: 'a.pdf',
        ocrResult: { document: { pages: 2 } },
        extractionCost: 0.3,
        createdAt: new Date('2026-01-20T00:00:00.000Z'),
      },
      {
        id: 2,
        filename: 'b.pdf',
        ocrResult: { document: { pages: 1 } },
        extractionCost: 0.1,
        createdAt: new Date('2026-01-19T00:00:00.000Z'),
      },
    ];

    const manifestQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(manifests),
    };
    (manifestRepository.createQueryBuilder as any).mockReturnValue(manifestQb);

    const jobs = [
      {
        id: 10,
        manifestId: 1,
        createdAt: new Date('2026-01-21T00:00:00.000Z'),
        ocrActualCost: 0.05,
        llmActualCost: 0.25,
        llmInputTokens: 100,
        llmOutputTokens: 50,
      },
      {
        id: 9,
        manifestId: 1,
        createdAt: new Date('2026-01-20T00:00:00.000Z'),
        ocrActualCost: 0.04,
        llmActualCost: 0.24,
        llmInputTokens: 80,
        llmOutputTokens: 40,
      },
      {
        id: 11,
        manifestId: 2,
        createdAt: new Date('2026-01-20T00:00:00.000Z'),
        ocrActualCost: 0.02,
        llmActualCost: 0.08,
        llmInputTokens: 20,
        llmOutputTokens: 10,
      },
    ];

    const jobQb: any = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(jobs),
    };
    jobRepository.createQueryBuilder.mockReturnValue(jobQb);

    const result = await service.getCostPerDocumentTrends(123, undefined, undefined, 2);

    expect(jobRepository.findOne).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].manifestId).toBe(1);
    expect(result[0].llmInputTokens).toBe(100);
  });
});
