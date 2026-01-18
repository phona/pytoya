import { PromptBuilderService } from './prompt-builder.service';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity, SchemaRuleOperator, SchemaRuleType } from '../entities/schema-rule.entity';

describe('PromptBuilderService', () => {
  const service = new PromptBuilderService();

  it('builds an extraction prompt with schema, rules, and settings', () => {
    const schema: SchemaEntity = {
      id: 1,
      name: 'Invoice Schema',
      jsonSchema: {
        type: 'object',
        properties: {
          invoice: {
            type: 'object',
            properties: {
              po_no: {
                type: 'string',
                'x-extraction-hint': 'Top right, 7 digits',
              },
            },
          },
        },
      },
      requiredFields: [],
      projectId: 1,
      extractionStrategy: 'ocr-first' as any,
      description: null,
      systemPromptTemplate: null,
      validationSettings: { strictMode: true },
      rules: [],
      project: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SchemaEntity;

    const rules: SchemaRuleEntity[] = [
      {
        id: 1,
        schemaId: 1,
        fieldPath: 'invoice.po_no',
        ruleType: SchemaRuleType.VERIFICATION,
        ruleOperator: SchemaRuleOperator.PATTERN,
        ruleConfig: { regex: '^\\d{7}$' },
        errorMessage: 'PO number must be 7 digits',
        priority: 8,
        enabled: true,
        description: null,
        schema: schema,
        createdAt: new Date(),
      } as SchemaRuleEntity,
      {
        id: 2,
        schemaId: 1,
        fieldPath: 'invoice.amount',
        ruleType: SchemaRuleType.RESTRICTION,
        ruleOperator: SchemaRuleOperator.RANGE_MIN,
        ruleConfig: { value: 0 },
        errorMessage: null,
        priority: 3,
        enabled: true,
        description: null,
        schema: schema,
        createdAt: new Date(),
      } as SchemaRuleEntity,
    ];

    const prompt = service.buildExtractionPrompt('OCR text', schema, rules);

    expect(prompt).toContain('JSON Schema:');
    expect(prompt).toContain('x-extraction-hint');
    expect(prompt).toContain('Validation Settings:');
    expect(prompt.indexOf('[8]')).toBeLessThan(prompt.indexOf('[3]'));
  });

  it('builds a re-extract prompt with missing fields and errors', () => {
    const schema = {
      id: 1,
      name: 'Schema',
      jsonSchema: { type: 'object', properties: {} },
      requiredFields: [],
      projectId: 1,
      extractionStrategy: 'ocr-first' as any,
      description: null,
      systemPromptTemplate: null,
      validationSettings: null,
      rules: [],
      project: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SchemaEntity;

    const prompt = service.buildReExtractPrompt(
      'OCR text',
      { invoice: { po_no: '123' } } as any,
      ['invoice.total'],
      'Missing total',
      schema,
      [],
    );

    expect(prompt).toContain('Missing fields:');
    expect(prompt).toContain('invoice.total');
    expect(prompt).toContain('Error: Missing total');
    expect(prompt).toContain('Previous result:');
  });
});
