import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemasController } from './schemas.controller';
import { SchemasService } from './schemas.service';
import { SchemaGeneratorService } from './schema-generator.service';
import { RuleGeneratorService } from './rule-generator.service';

describe('SchemasController', () => {
  let app: INestApplication;

  const schemasService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByProject: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validateSchemaDefinition: jest.fn(),
    validateWithRequiredFields: jest.fn(),
    parseSchemaContent: jest.fn(),
  };

  const schemaGeneratorService = {
    generate: jest.fn(),
  };

  const ruleGeneratorService = {
    generate: jest.fn(),
  };

  const schema: SchemaEntity = {
    id: 1,
    name: 'Invoice Schema',
    jsonSchema: { type: 'object', properties: {} },
    requiredFields: [],
    projectId: 1,
    description: null,
    systemPromptTemplate: null,
    validationSettings: null,
    rules: [],
    project: {} as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as SchemaEntity;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SchemasController],
      providers: [
        { provide: SchemasService, useValue: schemasService },
        { provide: SchemaGeneratorService, useValue: schemaGeneratorService },
        { provide: RuleGeneratorService, useValue: ruleGeneratorService },
      ],
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

  it('generates a schema', async () => {
    schemaGeneratorService.generate.mockResolvedValue({ type: 'object', properties: {} });

    const response = await request(app.getHttpServer())
      .post('/schemas/generate')
      .send({ description: 'Invoice schema', modelId: 'llm-1' })
      .expect(201);

    expect(response.body.jsonSchema).toEqual({ type: 'object', properties: {} });
    expect(schemaGeneratorService.generate).toHaveBeenCalled();
  });

  it('returns 400 for templates endpoint', async () => {
    await request(app.getHttpServer())
      .get('/schemas/templates')
      .expect(400);
  });

  it('returns 400 when generating rules without jsonSchema', async () => {
    await request(app.getHttpServer())
      .post('/schemas/generate-rules')
      .send({ description: 'Rules', modelId: 'llm-1' })
      .expect(400);
  });

  it('generates rules from schema payload', async () => {
    ruleGeneratorService.generate.mockResolvedValue([{ fieldPath: 'invoice.po_no' }]);

    const response = await request(app.getHttpServer())
      .post('/schemas/generate-rules')
      .send({
        description: 'Rules',
        modelId: 'llm-1',
        jsonSchema: { type: 'object', properties: {} },
      })
      .expect(201);

    expect(response.body.rules).toHaveLength(1);
    expect(ruleGeneratorService.generate).toHaveBeenCalled();
  });

  it('generates rules from saved schema', async () => {
    schemasService.findOne.mockResolvedValue(schema);
    ruleGeneratorService.generate.mockResolvedValue([{ fieldPath: 'invoice.po_no' }]);

    const response = await request(app.getHttpServer())
      .post('/schemas/1/generate-rules')
      .send({
        description: 'Rules',
        modelId: 'llm-1',
      })
      .expect(201);

    expect(response.body.rules).toHaveLength(1);
    expect(schemasService.findOne).toHaveBeenCalledWith(1);
    expect(ruleGeneratorService.generate).toHaveBeenCalled();
  });
});
