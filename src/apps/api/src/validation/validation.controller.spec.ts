import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';

describe('ValidationController route order', () => {
  let app: INestApplication;

  const validationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByProject: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validateScriptSyntax: jest.fn(),
    testValidationScript: jest.fn(),
    generateScriptTemplate: jest.fn(),
    runValidation: jest.fn(),
    runBatchValidation: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ValidationController],
      providers: [{ provide: ValidationService, useValue: validationService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
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

  it('routes POST /validation/scripts/generate to the generate handler (not scripts/:id)', async () => {
    validationService.generateScriptTemplate.mockResolvedValue({
      name: 'Generated script',
      description: null,
      severity: 'warning',
      script: 'function validate() { return []; }',
    });

    await request(app.getHttpServer())
      .post('/validation/scripts/generate')
      .send({ llmModelId: 'model-1', prompt: 'hi', structured: {} })
      .expect(201);

    expect(validationService.generateScriptTemplate).toHaveBeenCalledTimes(1);
    expect(validationService.update).not.toHaveBeenCalled();
  });

  it('routes POST /validation/scripts/test to the test handler (not scripts/:id)', async () => {
    validationService.testValidationScript.mockResolvedValue({
      result: { issues: [], errorCount: 0, warningCount: 0, validatedAt: new Date().toISOString() },
      debug: { logs: [] },
    });

    await request(app.getHttpServer())
      .post('/validation/scripts/test')
      .send({ script: 'function validate() { return []; }', extractedData: {}, debug: true })
      .expect(201);

    expect(validationService.testValidationScript).toHaveBeenCalledTimes(1);
    expect(validationService.update).not.toHaveBeenCalled();
  });
});
