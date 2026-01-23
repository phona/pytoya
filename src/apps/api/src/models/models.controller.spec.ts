import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ModelEntity } from '../entities/model.entity';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';

describe('ModelsController', () => {
  let app: INestApplication;
  const modelsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updatePricing: jest.fn(),
    remove: jest.fn(),
    testConnection: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ModelsController],
      providers: [{ provide: ModelsService, useValue: modelsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req: any, _res: any, next: any) => {
      const roleHeader = String(req.headers['x-test-role'] ?? '').toLowerCase();
      req.user = {
        id: 1,
        username: 'test-user',
        role: roleHeader === 'user' ? 'user' : 'admin',
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists adapter schemas', async () => {
    const response = await request(app.getHttpServer())
      .get('/models/adapters')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('lists models with masked secrets', async () => {
    const model: ModelEntity = {
      id: 'model-1',
      name: 'OpenAI GPT-4o',
      adapterType: 'openai',
      description: null,
      parameters: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret',
        modelName: 'gpt-4o',
      },
      pricing: {
        effectiveDate: new Date('2025-01-01T00:00:00.000Z'),
        llm: { inputPrice: 2.5, outputPrice: 10.0, currency: 'USD' },
      } as any,
      pricingHistory: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ModelEntity;

    modelsService.findAll.mockResolvedValue([model]);

    const response = await request(app.getHttpServer())
      .get('/models?category=llm')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].parameters.apiKey).toBe('********');
    expect(modelsService.findAll).toHaveBeenCalledWith({
      category: 'llm',
      adapterType: undefined,
      isActive: undefined,
    });
  });

  it('creates a model', async () => {
    const model: ModelEntity = {
      id: 'model-2',
      name: 'PaddleX OCR',
      adapterType: 'paddlex',
      description: null,
      parameters: { baseUrl: 'http://localhost:8080' },
      pricing: {
        effectiveDate: new Date('2025-01-01T00:00:00.000Z'),
        ocr: { pricePerPage: 0.001, currency: 'USD' },
      } as any,
      pricingHistory: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ModelEntity;

    modelsService.create.mockResolvedValue(model);

    const response = await request(app.getHttpServer())
      .post('/models')
      .send({
        name: 'PaddleX OCR',
        adapterType: 'paddlex',
        parameters: { baseUrl: 'http://localhost:8080' },
      })
      .expect(201);

    expect(response.body.id).toBe('model-2');
    expect(modelsService.create).toHaveBeenCalled();
  });

  it('tests model connection', async () => {
    modelsService.testConnection.mockResolvedValue({
      ok: true,
      message: 'LLM connection ok',
      model: 'gpt-4o',
    });

    const response = await request(app.getHttpServer())
      .post('/models/model-3/test')
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(modelsService.testConnection).toHaveBeenCalledWith('model-3');
  });

  it('updates model pricing', async () => {
    const model: ModelEntity = {
      id: 'model-4',
      name: 'GPT-4o Mini',
      adapterType: 'openai',
      description: null,
      parameters: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret',
        modelName: 'gpt-4o-mini',
      },
      pricing: {
        llm: {
          inputPrice: 0.15,
          outputPrice: 0.6,
          currency: 'USD',
        },
        effectiveDate: new Date('2025-01-10T00:00:00.000Z'),
      } as any,
      pricingHistory: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ModelEntity;

    modelsService.update.mockResolvedValue(model);

    const response = await request(app.getHttpServer())
      .patch('/models/model-4/pricing')
      .send({
        pricing: {
          llm: {
            inputPrice: 0.15,
            outputPrice: 0.6,
            currency: 'USD',
          },
        },
      })
      .expect(200);

    expect(modelsService.update).toHaveBeenCalledWith('model-4', {
      pricing: {
        llm: {
          inputPrice: 0.15,
          outputPrice: 0.6,
          currency: 'USD',
        },
      },
    });
    expect(response.body.id).toBe('model-4');
    expect(response.body.pricing?.llm?.inputPrice).toBe(0.15);
  });

  it('forbids non-admin updates to pricing via model update', async () => {
    await request(app.getHttpServer())
      .patch('/models/model-6')
      .set('x-test-role', 'user')
      .send({
        pricing: {
          llm: {
            inputPrice: 1,
            outputPrice: 2,
            currency: 'USD',
          },
        },
      })
      .expect(403);

    expect(modelsService.update).not.toHaveBeenCalled();
  });

  it('allows admin updates to pricing via model update', async () => {
    const model: ModelEntity = {
      id: 'model-7',
      name: 'Admin Updated',
      adapterType: 'openai',
      description: null,
      parameters: {},
      pricing: {
        llm: { inputPrice: 1, outputPrice: 2, currency: 'USD' },
        effectiveDate: new Date('2025-01-10T00:00:00.000Z'),
      } as any,
      pricingHistory: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ModelEntity;

    modelsService.update.mockResolvedValue(model);

    const response = await request(app.getHttpServer())
      .patch('/models/model-7')
      .set('x-test-role', 'admin')
      .send({
        pricing: {
          llm: { inputPrice: 1, outputPrice: 2, currency: 'USD' },
        },
      })
      .expect(200);

    expect(modelsService.update).toHaveBeenCalledWith('model-7', {
      pricing: {
        llm: { inputPrice: 1, outputPrice: 2, currency: 'USD' },
      },
    });
    expect(response.body.id).toBe('model-7');
  });
});
