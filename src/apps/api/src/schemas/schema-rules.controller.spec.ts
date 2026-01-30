import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchemaRuleEntity, SchemaRuleOperator, SchemaRuleType } from '../entities/schema-rule.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRulesController } from './schema-rules.controller';
import { SchemaRulesService } from './schema-rules.service';
import { SchemasService } from './schemas.service';

describe('SchemaRulesController', () => {
  let app: INestApplication;
  const schemaRulesService = {
    findBySchema: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const schemasService = {
    findOne: jest.fn(),
  };

  const rule: SchemaRuleEntity = {
    id: 1,
    schemaId: 1,
    fieldPath: 'invoice.po_no',
    ruleType: SchemaRuleType.VERIFICATION,
    ruleOperator: SchemaRuleOperator.PATTERN,
    ruleConfig: { regex: '^\\d{7}$' },
    errorMessage: null,
    priority: 5,
    enabled: true,
    description: null,
    schema: {} as SchemaEntity,
    createdAt: new Date(),
  } as SchemaRuleEntity;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SchemaRulesController],
      providers: [
        { provide: SchemaRulesService, useValue: schemaRulesService },
        { provide: SchemasService, useValue: schemasService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 1, role: 'admin', username: 'admin' };
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

  it('lists schema rules', async () => {
    schemasService.findOne.mockResolvedValue({ id: 1 } as any);
    schemaRulesService.findBySchema.mockResolvedValue([rule]);

    const response = await request(app.getHttpServer())
      .get('/schemas/1/rules')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(1);
    expect(schemaRulesService.findBySchema).toHaveBeenCalledWith(1);
  });

  it('creates a schema rule', async () => {
    schemasService.findOne.mockResolvedValue({ id: 1 } as any);
    schemaRulesService.create.mockResolvedValue(rule);

    const response = await request(app.getHttpServer())
      .post('/schemas/1/rules')
      .send({
        schemaId: 1,
        fieldPath: 'invoice.po_no',
        ruleType: 'verification',
        ruleOperator: 'pattern',
        ruleConfig: { regex: '^\\d{7}$' },
      })
      .expect(201);

    expect(response.body.id).toBe(1);
    expect(schemaRulesService.create).toHaveBeenCalled();
  });

  it('updates a schema rule', async () => {
    schemasService.findOne.mockResolvedValue({ id: 1 } as any);
    schemaRulesService.update.mockResolvedValue({ ...rule, priority: 9 });

    const response = await request(app.getHttpServer())
      .patch('/schemas/1/rules/1')
      .send({ priority: 9 })
      .expect(200);

    expect(response.body.priority).toBe(9);
    expect(schemaRulesService.update).toHaveBeenCalledWith(1, 1, { priority: 9 });
  });

  it('removes a schema rule', async () => {
    schemasService.findOne.mockResolvedValue({ id: 1 } as any);
    schemaRulesService.remove.mockResolvedValue(rule);

    const response = await request(app.getHttpServer())
      .delete('/schemas/1/rules/1')
      .expect(200);

    expect(response.body.id).toBe(1);
    expect(schemaRulesService.remove).toHaveBeenCalledWith(1, 1);
  });
});
