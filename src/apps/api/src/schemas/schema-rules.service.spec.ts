import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SchemaRulesService } from './schema-rules.service';
import { SchemaRuleEntity, SchemaRuleOperator, SchemaRuleType } from '../entities/schema-rule.entity';
import { SchemaEntity } from '../entities/schema.entity';

describe('SchemaRulesService', () => {
  let service: SchemaRulesService;
  let schemaRuleRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  let schemaRepository: { findOne: jest.Mock };

  beforeEach(() => {
    schemaRuleRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    schemaRepository = {
      findOne: jest.fn(),
    };

    service = new SchemaRulesService(
      schemaRuleRepository as any,
      schemaRepository as any,
    );
  });

  it('creates a schema rule with defaults', async () => {
    schemaRepository.findOne.mockResolvedValue({ id: 1 } as SchemaEntity);
    schemaRuleRepository.create.mockImplementation((value: SchemaRuleEntity) => value);
    schemaRuleRepository.save.mockImplementation(async (value: SchemaRuleEntity) => ({
      ...value,
      id: 10,
    }));

    const result = await service.create(1, {
      schemaId: 1,
      fieldPath: ' invoice.po_no ',
      ruleType: SchemaRuleType.VERIFICATION,
      ruleOperator: SchemaRuleOperator.PATTERN,
      ruleConfig: { regex: '^\\d{7}$' },
    });

    expect(schemaRuleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaId: 1,
        fieldPath: 'invoice.po_no',
        ruleType: SchemaRuleType.VERIFICATION,
        ruleOperator: SchemaRuleOperator.PATTERN,
        ruleConfig: { regex: '^\\d{7}$' },
        priority: 0,
        enabled: true,
      }),
    );
    expect(result.id).toBe(10);
  });

  it('defaults field path for OCR correction rules', async () => {
    schemaRepository.findOne.mockResolvedValue({ id: 1 } as SchemaEntity);
    schemaRuleRepository.create.mockImplementation((value: SchemaRuleEntity) => value);
    schemaRuleRepository.save.mockImplementation(async (value: SchemaRuleEntity) => ({
      ...value,
      id: 11,
    }));

    const result = await service.create(1, {
      schemaId: 1,
      fieldPath: '  ',
      ruleType: SchemaRuleType.RESTRICTION,
      ruleOperator: SchemaRuleOperator.OCR_CORRECTION,
      ruleConfig: { mappings: [] },
    });

    expect(result.fieldPath).toBe('*');
  });

  it('rejects empty field path for non-OCR rules', async () => {
    schemaRepository.findOne.mockResolvedValue({ id: 1 } as SchemaEntity);

    await expect(
      service.create(1, {
        schemaId: 1,
        fieldPath: '  ',
        ruleType: SchemaRuleType.RESTRICTION,
        ruleOperator: SchemaRuleOperator.PATTERN,
        ruleConfig: { regex: '^\\d{7}$' },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects mismatched schema IDs on create', async () => {
    schemaRepository.findOne.mockResolvedValue({ id: 1 } as SchemaEntity);

    await expect(
      service.create(1, {
        schemaId: 2,
        fieldPath: 'invoice.po_no',
        ruleType: SchemaRuleType.VERIFICATION,
        ruleOperator: SchemaRuleOperator.PATTERN,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists rules for a schema', async () => {
    const rules = [{ id: 1 }, { id: 2 }];
    schemaRepository.findOne.mockResolvedValue({ id: 1 } as SchemaEntity);
    schemaRuleRepository.find.mockResolvedValue(rules);

    const result = await service.findBySchema(1);

    expect(schemaRuleRepository.find).toHaveBeenCalledWith({
      where: { schemaId: 1 },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
    expect(result).toEqual(rules);
  });

  it('updates a rule', async () => {
    const existingRule = {
      id: 10,
      schemaId: 1,
      fieldPath: 'invoice.po_no',
      ruleType: SchemaRuleType.VERIFICATION,
      ruleOperator: SchemaRuleOperator.PATTERN,
      ruleConfig: {},
      errorMessage: null,
      priority: 0,
      enabled: true,
      description: null,
    } as SchemaRuleEntity;

    schemaRuleRepository.findOne.mockResolvedValue(existingRule);
    schemaRuleRepository.save.mockImplementation(async (value: SchemaRuleEntity) => value);

    const result = await service.update(1, 10, {
      fieldPath: 'invoice.po_no ',
      priority: 5,
      enabled: false,
    });

    expect(result.fieldPath).toBe('invoice.po_no');
    expect(result.priority).toBe(5);
    expect(result.enabled).toBe(false);
  });

  it('throws when updating missing rule', async () => {
    schemaRuleRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(1, 99, { priority: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('removes a rule', async () => {
    const existingRule = { id: 10 } as SchemaRuleEntity;
    schemaRuleRepository.findOne.mockResolvedValue(existingRule);
    schemaRuleRepository.remove.mockResolvedValue(existingRule);

    const result = await service.remove(1, 10);

    expect(schemaRuleRepository.remove).toHaveBeenCalledWith(existingRule);
    expect(result).toEqual(existingRule);
  });

  it('throws when removing missing rule', async () => {
    schemaRuleRepository.findOne.mockResolvedValue(null);

    await expect(
      service.remove(1, 10),
    ).rejects.toThrow(NotFoundException);
  });
});
