import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../auth/casl/policies.guard';
import { ExtractorsController } from './extractors.controller';
import { ExtractorsService } from './extractors.service';
import { TextExtractorRegistry } from '../text-extractor/text-extractor.registry';
import { ExtractorCostService } from './extractor-cost.service';
import { AbilityFactory } from '../auth/casl/ability.factory';

describe('ExtractorsController', () => {
  let app: INestApplication;
  const extractorsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getUsageCounts: jest.fn(),
    testConnection: jest.fn(),
  };
  const extractorRegistry = {
    list: jest.fn(),
    get: jest.fn(),
  };
  const extractorCostService = {
    getCostSummary: jest.fn(),
    getCostSummaries: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ExtractorsController],
      providers: [
        { provide: ExtractorsService, useValue: extractorsService },
        { provide: TextExtractorRegistry, useValue: extractorRegistry },
        { provide: ExtractorCostService, useValue: extractorCostService },
        AbilityFactory,
        PoliciesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const roleHeader = String(req.headers['x-test-role'] ?? '').toLowerCase();
          req.user = {
            id: 1,
            role: roleHeader === 'user' ? 'user' : 'admin',
            username: 'test',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists extractor types', async () => {
    extractorRegistry.list.mockReturnValue([
      {
        id: 'vision-llm',
        name: 'Vision LLM',
        description: 'Vision extractor',
        version: '1.0.0',
        category: 'vision',
        paramsSchema: {},
        supportedFormats: ['image'],
        pricingSchema: {},
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/extractors/types')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe('vision-llm');
  });

  it('lists extractors with usage counts', async () => {
    const extractor = {
      id: 'extractor-1',
      name: 'Vision LLM',
      description: null,
      extractorType: 'vision-llm',
      config: { apiKey: 'sk-test', pricing: { mode: 'token', currency: 'USD' } },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    extractorsService.findAll.mockResolvedValue([extractor]);
    extractorsService.getUsageCounts.mockResolvedValue({ 'extractor-1': 3 });
    extractorRegistry.get.mockReturnValue({
      metadata: {
        paramsSchema: { apiKey: { type: 'string', required: true, label: 'API Key', secret: true } },
      },
    });

    const response = await request(app.getHttpServer())
      .get('/extractors?extractorType=vision-llm&isActive=true')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe('extractor-1');
    expect(response.body[0].usageCount).toBe(3);
    expect(response.body[0].config.apiKey).toBe('********');
    expect(extractorsService.findAll).toHaveBeenCalledWith({
      extractorType: 'vision-llm',
      isActive: true,
    });
  });

  it('creates an extractor', async () => {
    extractorsService.create.mockResolvedValue({
      id: 'extractor-2',
      name: 'New Extractor',
      description: null,
      extractorType: 'vision-llm',
      config: { pricing: { mode: 'token', currency: 'USD' } },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .post('/extractors')
      .set('x-test-role', 'admin')
      .send({ name: 'New Extractor', extractorType: 'vision-llm' })
      .expect(201);

    expect(response.body.id).toBe('extractor-2');
    expect(extractorsService.create).toHaveBeenCalled();
  });

  it('forbids creating an extractor for non-admin', async () => {
    await request(app.getHttpServer())
      .post('/extractors')
      .set('x-test-role', 'user')
      .send({ name: 'New Extractor', extractorType: 'vision-llm' })
      .expect(403);
  });

  it('updates an extractor', async () => {
    extractorsService.update.mockResolvedValue({
      id: 'extractor-3',
      name: 'Updated Extractor',
      description: null,
      extractorType: 'vision-llm',
      config: { pricing: { mode: 'token', currency: 'USD' } },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    extractorsService.getUsageCounts.mockResolvedValue({ 'extractor-3': 1 });

    const response = await request(app.getHttpServer())
      .patch('/extractors/extractor-3')
      .set('x-test-role', 'admin')
      .send({ name: 'Updated Extractor' })
      .expect(200);

    expect(response.body.id).toBe('extractor-3');
    expect(extractorsService.update).toHaveBeenCalledWith('extractor-3', { name: 'Updated Extractor' });
  });

  it('deletes an extractor', async () => {
    extractorsService.remove.mockResolvedValue({
      id: 'extractor-4',
      name: 'Deleted Extractor',
      description: null,
      extractorType: 'vision-llm',
      config: { pricing: { mode: 'token', currency: 'USD' } },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .delete('/extractors/extractor-4')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(response.body.id).toBe('extractor-4');
    expect(extractorsService.remove).toHaveBeenCalledWith('extractor-4');
  });

  it('tests extractor connection', async () => {
    extractorsService.testConnection.mockResolvedValue({
      ok: true,
      message: 'ok',
      latencyMs: 120,
    });

    const response = await request(app.getHttpServer())
      .post('/extractors/extractor-5/test')
      .set('x-test-role', 'admin')
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.message).toBe('ok');
    expect(extractorsService.testConnection).toHaveBeenCalledWith('extractor-5');
  });

  it('returns extractor cost summary', async () => {
    extractorsService.findOne.mockResolvedValue({
      id: 'extractor-6',
      name: 'Costed Extractor',
      description: null,
      extractorType: 'vision-llm',
      config: { pricing: { mode: 'token', currency: 'USD' } },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    extractorCostService.getCostSummary.mockResolvedValue({
      extractorId: 'extractor-6',
      extractorName: 'Costed Extractor',
      totalExtractions: 2,
      totalCost: 0.12,
      averageCostPerExtraction: 0.06,
      currency: 'USD',
      costBreakdown: { byDate: [], byProject: [] },
    });

    const response = await request(app.getHttpServer())
      .get('/extractors/extractor-6/cost-summary')
      .expect(200);

    expect(response.body.totalCost).toBe(0.12);
    expect(extractorCostService.getCostSummary).toHaveBeenCalled();
  });

  it('returns extractor cost summaries', async () => {
    extractorsService.findAll.mockResolvedValue([
      {
        id: 'extractor-1',
        name: 'Vision LLM',
        description: null,
        extractorType: 'vision-llm',
        config: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    extractorCostService.getCostSummaries.mockResolvedValue([
      {
        extractorId: 'extractor-1',
        extractorName: 'Vision LLM',
        totalExtractions: 0,
        totalCost: null,
        averageCostPerExtraction: null,
        currency: null,
        costBreakdown: { byDate: [], byProject: [] },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/extractors/cost-summaries?ids=extractor-1')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].extractorId).toBe('extractor-1');
    expect(extractorCostService.getCostSummaries).toHaveBeenCalled();
  });
});
