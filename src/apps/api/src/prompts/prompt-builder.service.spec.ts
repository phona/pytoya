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

  it('includes OCR quality assessment for poor quality score', () => {
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

    const { systemContext } = service.buildExtractionPrompt('OCR text', schema, [], undefined, {
      ocrQualityScore: 55,
    });

    expect(systemContext).toContain('OCR Domain Context:');
    expect(systemContext).toContain('55/100 (Poor)');
    expect(systemContext).toContain('Common OCR confusions:');
  });

  it('includes OCR quality assessment for good quality score', () => {
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

    const { systemContext } = service.buildExtractionPrompt('OCR text', schema, [], undefined, {
      ocrQualityScore: 80,
    });

    expect(systemContext).toContain('80/100 (Good)');
    expect(systemContext).toContain('character-level errors');
    expect(systemContext).not.toContain('Characters easily confused');
  });

  it('omits OCR quality block for excellent score', () => {
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

    const { systemContext } = service.buildExtractionPrompt('OCR text', schema, [], undefined, {
      ocrQualityScore: 95,
    });

    expect(systemContext).toContain('95/100 (Excellent)');
    expect(systemContext).not.toContain('character-level errors');
  });

  it('omits OCR quality block when no score is provided', () => {
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

    const { systemContext } = service.buildExtractionPrompt('OCR text', schema, []);

    expect(systemContext).not.toContain('OCR Quality Assessment:');
  });

  it('includes structured tables in user input', () => {
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

    const { userInput } = service.buildExtractionPrompt('OCR text', schema, [], undefined, {
      structuredTables: [
        {
          pageNumber: 1,
          cells: [
            ['Name', 'Qty', 'Price'],
            ['Widget', '10', '5.00'],
            ['Gadget', '5', '12.50'],
          ],
        },
      ],
    });

    expect(userInput).toContain('Structured Table Data');
    expect(userInput).toContain('Table (Page 1)');
    expect(userInput).toContain('Name');
    expect(userInput).toContain('Widget');
    expect(userInput).toContain('more reliable than the raw OCR text');
  });

  it('omits structured tables block when no tables provided', () => {
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

    const { userInput } = service.buildExtractionPrompt('OCR text', schema, [], undefined, {
      structuredTables: [],
    });

    expect(userInput).not.toContain('Structured Table Data');
  });

  it('includes _extraction_info instructions in extraction prompt header', () => {
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

    const { systemContext } = service.buildExtractionPrompt('OCR text', schema, []);

    expect(systemContext).toContain('_extraction_info');
    expect(systemContext).toContain('field_confidences');
    expect(systemContext).toContain('uncertain_fields');
  });

  it('includes _extraction_info instructions in re-extract prompt', () => {
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
      { invoice: { total: 100 } } as any,
      ['invoice.po_no'],
      'Missing PO',
      schema,
      [],
    );

    expect(systemContext).toContain('_extraction_info');
    expect(systemContext).toContain('field_confidences');
  });

  it('formats cross-field rules in validation settings', () => {
    const schema = {
      id: 1,
      name: 'Schema',
      schemaVersion: null,
      jsonSchema: { type: 'object', properties: {} },
      requiredFields: [],
      projectId: 1,
      description: null,
      systemPromptTemplate: null,
      validationSettings: {
        crossFieldRules: [
          { id: '1', name: 'Sum check', expression: 'sum(items[].amount) == totalAmount', errorMessage: 'Sum mismatch', severity: 'error', enabled: true },
          { id: '2', name: 'Disabled rule', expression: 'x == y', errorMessage: 'N/A', severity: 'warning', enabled: false },
        ],
      },
      rules: [],
      project: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SchemaEntity;

    const { systemContext } = service.buildExtractionPrompt('OCR text', schema, []);

    expect(systemContext).toContain('Cross-Field Validation Rules');
    expect(systemContext).toContain('Sum check');
    expect(systemContext).toContain('sum(items[].amount) == totalAmount');
    expect(systemContext).not.toContain('Disabled rule');
  });

  describe('buildReExtractPrompt — scope narrowing', () => {
    const fullSchema = {
      id: 1,
      name: 'Invoice',
      schemaVersion: null,
      jsonSchema: {
        type: 'object',
        properties: {
          invoiceNo: { type: 'string' },
          poNumber: { type: 'string' },
          vendor: { type: 'string' },
          totalAmount: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                unitPrice: { type: 'number' },
                quantity: { type: 'number' },
              },
              required: ['name', 'unitPrice'],
            },
          },
        },
        required: ['invoiceNo', 'poNumber', 'vendor', 'totalAmount', 'items'],
      },
      requiredFields: ['invoiceNo', 'poNumber', 'vendor', 'totalAmount', 'items'],
      projectId: 1,
      description: null,
      systemPromptTemplate: null,
      validationSettings: null,
      rules: [],
      project: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SchemaEntity;

    const allRules: SchemaRuleEntity[] = [
      {
        id: 1, schemaId: 1, fieldPath: 'poNumber', ruleType: SchemaRuleType.VERIFICATION,
        ruleOperator: SchemaRuleOperator.PATTERN, ruleConfig: { pattern: '^\\d{7}$' },
        priority: 10, errorMessage: '7 digits', enabled: true, description: null,
        schema: fullSchema, createdAt: new Date(),
      } as SchemaRuleEntity,
      {
        id: 2, schemaId: 1, fieldPath: 'items.*.unitPrice', ruleType: SchemaRuleType.RESTRICTION,
        ruleOperator: SchemaRuleOperator.RANGE_MIN, ruleConfig: { value: 0 },
        priority: 5, errorMessage: 'positive', enabled: true, description: null,
        schema: fullSchema, createdAt: new Date(),
      } as SchemaRuleEntity,
      {
        id: 3, schemaId: 1, fieldPath: 'vendor', ruleType: SchemaRuleType.VERIFICATION,
        ruleOperator: SchemaRuleOperator.PATTERN, ruleConfig: {},
        priority: 5, errorMessage: 'required', enabled: true, description: null,
        schema: fullSchema, createdAt: new Date(),
      } as SchemaRuleEntity,
    ];

    it('narrows schema to target fields on re-extract', () => {
      const { systemContext } = service.buildReExtractPrompt(
        'OCR text',
        { invoiceNo: 'INV-001', vendor: 'Acme', totalAmount: 100 } as any,
        ['poNumber'],
        'Missing required field: poNumber',
        fullSchema,
        allRules,
      );

      // Schema section should say "target fields only"
      expect(systemContext).toContain('target fields only');
      // Extract the schema JSON block to verify field narrowing
      const schemaSection = systemContext.split('JSON Schema (target fields only):')[1]?.split('\n\nRequired')[0] ?? '';
      expect(schemaSection).toContain('poNumber');
      expect(schemaSection).not.toContain('"vendor"');
      expect(schemaSection).not.toContain('"totalAmount"');
      expect(schemaSection).not.toContain('"items"');
    });

    it('narrows rules to target fields on re-extract', () => {
      const { systemContext } = service.buildReExtractPrompt(
        'OCR text',
        { invoiceNo: 'INV-001' } as any,
        ['poNumber'],
        'Missing required field: poNumber',
        fullSchema,
        allRules,
      );

      // Should include poNumber rule but not items rules
      const rulesSection = systemContext.split('Validation Rules:')[1]?.split('\n\n')[0] ?? '';
      expect(rulesSection).toContain('7 digits');
      expect(rulesSection).not.toContain('positive');
    });

    it('narrows array sub-fields in schema', () => {
      const { systemContext } = service.buildReExtractPrompt(
        'OCR text',
        { invoiceNo: 'INV-001', poNumber: '0000009' } as any,
        ['items[].unitPrice'],
        'items.0.unitPrice must be number',
        fullSchema,
        allRules,
      );

      // Schema section should contain items with unitPrice but not other top-level fields
      const schemaSection = systemContext.split('JSON Schema (target fields only):')[1]?.split('\n\nRequired')[0] ?? '';
      expect(schemaSection).toContain('unitPrice');
      expect(schemaSection).not.toContain('"vendor"');
      expect(schemaSection).not.toContain('"poNumber"');
      // items rule should be included, poNumber rule should not
      const rulesSection = systemContext.split('Validation Rules:')[1]?.split('\n\n')[0] ?? '';
      expect(rulesSection).toContain('positive');
      expect(rulesSection).not.toContain('7 digits');
    });

    it('keeps full prompt when missingFields is empty', () => {
      const { systemContext } = service.buildReExtractPrompt(
        'OCR text',
        { invoiceNo: 'INV-001' } as any,
        [],
        'General validation error',
        fullSchema,
        allRules,
      );

      // Full schema should be present
      expect(systemContext).toContain('"invoiceNo"');
      expect(systemContext).toContain('"vendor"');
      expect(systemContext).toContain('"totalAmount"');
      expect(systemContext).toContain('"items"');
      // All rules
      expect(systemContext).toContain('7 digits');
      expect(systemContext).toContain('positive');
    });

    it('trims few-shot examples to target fields', () => {
      const fewShot = [
        {
          ocrSnippet: 'Invoice text...',
          extractedData: {
            invoiceNo: 'INV-001',
            poNumber: '0000009',
            vendor: 'FewShotVendorXYZ',
            totalAmount: 99999,
          } as any,
        },
      ];

      const { systemContext } = service.buildReExtractPrompt(
        'OCR text',
        { invoiceNo: 'INV-001' } as any,
        ['poNumber'],
        'Missing poNumber',
        fullSchema,
        [],
        undefined,
        { fewShotExamples: fewShot },
      );

      // Few-shot section should only show poNumber field
      const fewShotSection = systemContext.split('Few-Shot Examples')[1] ?? '';
      expect(fewShotSection).toContain('0000009');
      expect(fewShotSection).not.toContain('FewShotVendorXYZ');
      expect(fewShotSection).not.toContain('99999');
    });

    it('narrows required fields to targets', () => {
      const { systemContext } = service.buildReExtractPrompt(
        'OCR text',
        {} as any,
        ['poNumber', 'vendor'],
        'Missing fields',
        fullSchema,
        allRules,
      );

      // Required fields should only list poNumber and vendor
      expect(systemContext).toContain('poNumber');
      expect(systemContext).toContain('vendor');
      // Should not list other required fields in the required block
      const requiredSection = systemContext.split('Required fields')[1]?.split('\n\n')[0] ?? '';
      expect(requiredSection).not.toContain('totalAmount');
      expect(requiredSection).not.toContain('invoiceNo');
    });
  });
});
