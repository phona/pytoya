import { AnalyticsRecommendationsService } from './analytics-recommendations.service';
import { UserEntity } from '../entities/user.entity';

type RawOneQueue = Array<Record<string, string | number> | undefined>;
type RawManyQueue = Array<Array<Record<string, unknown>>>;

function makeManifestRepo(rawOneQueue: RawOneQueue) {
  let i = 0;
  const createBuilder = () => {
    const builder: any = {};
    for (const method of [
      'innerJoin',
      'where',
      'andWhere',
      'select',
      'addSelect',
      'setParameter',
    ]) {
      builder[method] = jest.fn(() => builder);
    }
    builder.getRawOne = jest.fn(async () => rawOneQueue[i++]);
    return builder;
  };
  return {
    createQueryBuilder: jest.fn(createBuilder),
  };
}

function makeOperationLogRepo(rawManyQueue: RawManyQueue) {
  let i = 0;
  const createBuilder = () => {
    const builder: any = {};
    for (const method of [
      'innerJoin',
      'where',
      'andWhere',
      'select',
      'addSelect',
      'setParameter',
    ]) {
      builder[method] = jest.fn(() => builder);
    }
    builder.getRawMany = jest.fn(async () => rawManyQueue[i++] ?? []);
    return builder;
  };
  return {
    createQueryBuilder: jest.fn(createBuilder),
  };
}

describe('AnalyticsRecommendationsService', () => {
  const user = { id: 1 } as UserEntity;

  const projectsService = { findOne: jest.fn().mockResolvedValue({ id: 42 }) };

  function makeService({
    manifestRaws,
    operationLogRaws,
  }: {
    manifestRaws: RawOneQueue;
    operationLogRaws: RawManyQueue;
  }) {
    const manifestRepo = makeManifestRepo(manifestRaws);
    const operationLogRepo = makeOperationLogRepo(operationLogRaws);
    return new AnalyticsRecommendationsService(
      manifestRepo as any,
      operationLogRepo as any,
      projectsService as any,
    );
  }

  afterEach(() => {
    projectsService.findOne.mockClear();
  });

  it('returns an empty list and a generatedAt timestamp when project is healthy', async () => {
    const service = makeService({
      // ocr, modelFailure, backlog all zero
      manifestRaws: [
        { scored: '0', poor: '0' },
        { total: '0', failed: '0' },
        { count: '0' },
      ],
      operationLogRaws: [[]],
    });

    const result = await service.getRecommendations(user, 42);
    expect(result.recommendations).toEqual([]);
    expect(typeof result.generatedAt).toBe('string');
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(projectsService.findOne).toHaveBeenCalledWith(user, 42);
  });

  it('emits an OCR-quality recommendation when the poor share exceeds the threshold', async () => {
    const service = makeService({
      manifestRaws: [
        { scored: '20', poor: '8' }, // 40% poor -> warning
        { total: '0', failed: '0' },
        { count: '0' },
      ],
      operationLogRaws: [[]],
    });

    const result = await service.getRecommendations(user, 42);
    const ocr = result.recommendations.find((r) => r.id === 'ocr-quality-low');
    expect(ocr).toBeDefined();
    expect(ocr?.severity).toBe('warning');
    expect(ocr?.titleVars).toEqual({ percent: 40 });
    expect(ocr?.actionHref).toBe('/projects/42/settings/extractors');
  });

  it('does not emit an OCR recommendation below the minimum scored count', async () => {
    const service = makeService({
      manifestRaws: [
        { scored: '3', poor: '3' },
        { total: '0', failed: '0' },
        { count: '0' },
      ],
      operationLogRaws: [[]],
    });

    const result = await service.getRecommendations(user, 42);
    expect(result.recommendations.find((r) => r.id === 'ocr-quality-low')).toBeUndefined();
  });

  it('emits field-correction recommendations for top paths, sorted by distinct manifests', async () => {
    const diffs = (path: string) => [{ path, before: 'a', after: 'b' }];
    const rows = [
      { diffs: diffs('poNo'), manifestId: 1 },
      { diffs: diffs('poNo'), manifestId: 2 },
      { diffs: diffs('poNo'), manifestId: 3 },
      { diffs: diffs('poNo'), manifestId: 4 },
      { diffs: diffs('poNo'), manifestId: 5 },
      { diffs: diffs('poNo'), manifestId: 5 }, // duplicate manifest → still distinct 5
      { diffs: diffs('qty'), manifestId: 11 },
      { diffs: diffs('qty'), manifestId: 12 },
      { diffs: diffs('qty'), manifestId: 13 },
    ];

    const service = makeService({
      manifestRaws: [
        { scored: '0', poor: '0' },
        { total: '0', failed: '0' },
        { count: '0' },
      ],
      operationLogRaws: [rows],
    });

    const result = await service.getRecommendations(user, 42);
    const ids = result.recommendations.map((r) => r.id);
    expect(ids).toContain('field-correction-poNo');
    expect(ids).not.toContain('field-correction-qty'); // qty has only 3 distinct manifests
  });

  it('emits a model-failure recommendation when failure rate is elevated', async () => {
    const service = makeService({
      manifestRaws: [
        { scored: '0', poor: '0' },
        { total: '20', failed: '6' }, // 30% failed -> critical
        { count: '0' },
      ],
      operationLogRaws: [[]],
    });

    const result = await service.getRecommendations(user, 42);
    const rec = result.recommendations.find((r) => r.id === 'model-failure-rate-high');
    expect(rec).toBeDefined();
    expect(rec?.severity).toBe('critical');
    expect(rec?.actionHref).toBe('/projects/42/settings/models');
  });

  it('emits a backlog recommendation when stale manifests pile up', async () => {
    const service = makeService({
      manifestRaws: [
        { scored: '0', poor: '0' },
        { total: '0', failed: '0' },
        { count: '25' },
      ],
      operationLogRaws: [[]],
    });

    const result = await service.getRecommendations(user, 42);
    const rec = result.recommendations.find((r) => r.id === 'backlog-stale-manifests');
    expect(rec).toBeDefined();
    expect(rec?.severity).toBe('warning');
  });

  it('sorts results by severity (critical first)', async () => {
    const service = makeService({
      manifestRaws: [
        { scored: '20', poor: '8' }, // ocr warning
        { total: '20', failed: '6' }, // model-failure critical
        { count: '6' }, // backlog info
      ],
      operationLogRaws: [[]],
    });

    const result = await service.getRecommendations(user, 42);
    const severities = result.recommendations.map((r) => r.severity);
    const sorted = [...severities].sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 } as const;
      return order[a] - order[b];
    });
    expect(severities).toEqual(sorted);
    expect(severities[0]).toBe('critical');
  });

  it('rejects when the caller does not own the project', async () => {
    projectsService.findOne.mockRejectedValueOnce(new Error('forbidden'));
    const service = makeService({
      manifestRaws: [],
      operationLogRaws: [[]],
    });
    await expect(service.getRecommendations(user, 42)).rejects.toThrow('forbidden');
  });
});
