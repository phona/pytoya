import { PromptBuilderService } from './prompt-builder.service';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity, SchemaRuleOperator, SchemaRuleType } from '../entities/schema-rule.entity';

describe('PromptBuilderService', () => {
  const service = new PromptBuilderService();

  it('builds an extraction prompt with schema, rules, and settings', () => {
    const schema: SchemaEntity = {
      id: 1,
      name: 'Invoice Schema',
      schemaVersion: null,
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

    const { systemContext, userInput } = service.buildExtractionPrompt('OCR text', schema, rules);

    expect(systemContext).toContain('JSON Schema:');
    expect(systemContext).toContain('x-extraction-hint');
    expect(systemContext).toContain('Validation Settings:');
    expect(systemContext.indexOf('[8]')).toBeLessThan(systemContext.indexOf('[3]'));

    expect(userInput).toContain('OCR Text (Markdown):');
    expect(userInput).toContain('OCR text');
    expect(userInput).not.toContain('JSON Schema:');
  });

  it('omits promptRulesMarkdown from validation settings', () => {
    const schema: SchemaEntity = {
      id: 1,
      name: 'Schema',
      schemaVersion: null,
      jsonSchema: { type: 'object', properties: {} },
      requiredFields: [],
      projectId: 1,
      description: null,
      systemPromptTemplate: null,
      validationSettings: { promptRulesMarkdown: '## OCR Corrections\n- O -> 0' } as any,
      rules: [],
      project: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SchemaEntity;

    const { systemContext } = service.buildExtractionPrompt('OCR text', schema, []);
    expect(systemContext).not.toContain('Validation Settings:');
    expect(systemContext).not.toContain('promptRulesMarkdown');
  });

  it('builds a re-extract prompt with missing fields and errors', () => {
    const schema = {
      id: 1,
      name: 'Schema',
      schemaVersion: null,
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

    const { systemContext, userInput } = service.buildReExtractPrompt(
      'OCR text',
      { invoice: { po_no: '123' } } as any,
      ['invoice.total'],
      'Missing total',
      schema,
      [],
    );

    expect(userInput).toContain('invoice.total');
    expect(userInput).toContain('OCR text');
    expect(userInput).not.toContain('Previous result:');

    expect(systemContext).toContain('Validation error:');
    expect(systemContext).toContain('Missing total');
    expect(systemContext).toContain('Previous result:');
  });

  it('omits target fields from the Previous result block', () => {
    const schema = {
      id: 1,
      name: 'Schema',
      schemaVersion: null,
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

    const { systemContext } = service.buildReExtractPrompt(
      'OCR text',
      { invoice: { po_no: '123', total: 100 }, items: [{ name: 'BAD' }] } as any,
      ['invoice.total', 'items'],
      undefined,
      schema,
      [],
    );

    const previousBlock =
      systemContext.split('Previous result:')[1]?.split('JSON Schema:')[0] ?? '';

    expect(previousBlock).toContain('"po_no"');
    expect(previousBlock).not.toContain('"total"');
    expect(previousBlock).not.toContain('"items"');
  });
});
