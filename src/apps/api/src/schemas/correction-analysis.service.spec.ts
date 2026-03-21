import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { OperationLogEntity } from '../entities/operation-log.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { CorrectionAnalysisService } from './correction-analysis.service';

const createMockQueryBuilder = (result: unknown[]) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(result),
  getRawMany: jest.fn().mockResolvedValue(result),
});

describe('CorrectionAnalysisService', () => {
  let service: CorrectionAnalysisService;
  let operationLogRepo: Record<string, jest.Mock>;
  let manifestRepo: Record<string, jest.Mock>;
  let schemaRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    operationLogRepo = {
      createQueryBuilder: jest.fn(),
    };
    manifestRepo = {
      createQueryBuilder: jest.fn(),
    };
    schemaRepo = {
      findOneOrFail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorrectionAnalysisService,
        {
          provide: getRepositoryToken(OperationLogEntity),
          useValue: operationLogRepo,
        },
        {
          provide: getRepositoryToken(ManifestEntity),
          useValue: manifestRepo,
        },
        {
          provide: getRepositoryToken(SchemaEntity),
          useValue: schemaRepo,
        },
      ],
    }).compile();

    service = module.get<CorrectionAnalysisService>(CorrectionAnalysisService);
  });

  const mockLogs = [
    {
      id: 1,
      manifestId: 1,
      action: 'manual_edit',
      diffs: [
        { path: 'items.0.amount', before: '1OO', after: '100' },
        { path: 'invoice.date', before: '2024-O1-15', after: '2024-01-15' },
      ],
      createdAt: new Date('2026-03-20'),
    },
    {
      id: 2,
      manifestId: 2,
      action: 'manual_edit',
      diffs: [
        { path: 'items.0.amount', before: '2OO', after: '200' },
      ],
      createdAt: new Date('2026-03-21'),
    },
  ];

  describe('aggregateCorrections', () => {
    it('should return empty result when no manifests exist', async () => {
      manifestRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([]),
      );

      const result = await service.aggregateCorrections(1);

      expect(result).toEqual({
        totalLogs: 0,
        totalDiffs: 0,
        dateRange: { from: null, to: null },
        topCorrectedFields: [],
        ocrConfusions: [],
        summary: {
          manifestsWithCorrections: 0,
          uniqueFieldsCorrected: 0,
          avgDiffsPerLog: 0,
        },
      });
    });

    it('should correctly aggregate corrections from operation logs', async () => {
      manifestRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([{ id: 1 }, { id: 2 }]),
      );
      operationLogRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder(mockLogs),
      );

      const result = await service.aggregateCorrections(1);

      expect(result.totalLogs).toBe(2);
      expect(result.totalDiffs).toBe(3);
      expect(result.summary.manifestsWithCorrections).toBe(2);
      expect(result.summary.uniqueFieldsCorrected).toBe(2);
      expect(result.summary.avgDiffsPerLog).toBe(1.5);

      // items.0.amount corrected twice, invoice.date once
      const amountField = result.topCorrectedFields.find(
        (f) => f.path === 'items.0.amount',
      );
      expect(amountField).toBeDefined();
      expect(amountField!.count).toBe(2);

      const dateField = result.topCorrectedFields.find(
        (f) => f.path === 'invoice.date',
      );
      expect(dateField).toBeDefined();
      expect(dateField!.count).toBe(1);

      // Date range
      expect(result.dateRange.from).toBe(new Date('2026-03-20').toISOString());
      expect(result.dateRange.to).toBe(new Date('2026-03-21').toISOString());
    });

    it('should detect OCR character confusions (e.g. "O" → "0")', async () => {
      manifestRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([{ id: 1 }, { id: 2 }]),
      );
      operationLogRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder(mockLogs),
      );

      const result = await service.aggregateCorrections(1);

      // "1OO" → "100" has O→0 substitution (twice: in items.0.amount)
      // "2024-O1-15" → "2024-01-15" has O→0 substitution (once: in invoice.date)
      const oConfusion = result.ocrConfusions.find(
        (c) => c.from === 'O' && c.to === '0',
      );
      expect(oConfusion).toBeDefined();
      expect(oConfusion!.count).toBeGreaterThanOrEqual(3);
      expect(oConfusion!.contexts.length).toBeGreaterThan(0);
    });

    it('should respect the since filter', async () => {
      manifestRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([{ id: 1 }]),
      );

      const logQb = createMockQueryBuilder([]);
      operationLogRepo.createQueryBuilder.mockReturnValue(logQb);

      const since = new Date('2026-03-19');
      await service.aggregateCorrections(1, { since });

      // Verify andWhere was called with the since parameter
      const andWhereCalls = logQb.andWhere.mock.calls;
      const sinceCall = andWhereCalls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && call[0].includes('created_at >= :since'),
      );
      expect(sinceCall).toBeDefined();
      expect(sinceCall![1]).toEqual({ since });
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should generate markdown with field summary and OCR confusions', () => {
      const analysis = {
        totalLogs: 2,
        totalDiffs: 3,
        dateRange: {
          from: '2026-03-20T00:00:00.000Z',
          to: '2026-03-21T00:00:00.000Z',
        },
        topCorrectedFields: [
          {
            path: 'items.0.amount',
            count: 2,
            examples: [
              { before: '1OO', after: '100', count: 1 },
              { before: '2OO', after: '200', count: 1 },
            ],
          },
        ],
        ocrConfusions: [
          { from: 'O', to: '0', count: 3, contexts: ['items.*.amount'] },
        ],
        summary: {
          manifestsWithCorrections: 2,
          uniqueFieldsCorrected: 2,
          avgDiffsPerLog: 1.5,
        },
      };

      const prompt = service.buildAnalysisPrompt(analysis);

      expect(prompt).toContain('2 human corrections');
      expect(prompt).toContain('3 field changes');
      expect(prompt).toContain('2 documents');
      expect(prompt).toContain('## Most Frequently Corrected Fields');
      expect(prompt).toContain('`items.*.amount`');
      expect(prompt).toContain('(2 corrections)');
      expect(prompt).toContain('"1OO" → "100"');
      expect(prompt).toContain('## Detected OCR Character Confusions');
      expect(prompt).toContain('| O | 0 | 3 |');
      expect(prompt).toContain('items.*.amount');
      expect(prompt).toContain('Please update the Prompt Rules');
    });
  });

  describe('getCorrectionSummary', () => {
    it('should return correct summary stats', async () => {
      schemaRepo.findOneOrFail.mockResolvedValue({
        id: 1,
        projectId: 10,
        updatedAt: new Date('2026-03-22'),
      });
      manifestRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([{ id: 1 }, { id: 2 }]),
      );
      operationLogRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder(mockLogs),
      );

      const result = await service.getCorrectionSummary(1);

      expect(result.totalCorrections).toBe(2);
      expect(result.uniqueFieldsCorrected).toBe(2);
      expect(result.manifestsAffected).toBe(2);
      // Schema updatedAt (2026-03-22) is after all log dates, so no new patterns
      expect(result.hasNewPatterns).toBe(false);
    });

    it('should set hasNewPatterns to true when corrections are newer than schema update', async () => {
      schemaRepo.findOneOrFail.mockResolvedValue({
        id: 1,
        projectId: 10,
        updatedAt: new Date('2026-03-19'), // before all log dates
      });
      manifestRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([{ id: 1 }, { id: 2 }]),
      );
      operationLogRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder(mockLogs),
      );

      const result = await service.getCorrectionSummary(1);

      expect(result.totalCorrections).toBe(2);
      expect(result.hasNewPatterns).toBe(true);
    });
  });
});
