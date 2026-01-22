import { describe, expect, it } from 'vitest';
import { deriveExtractionHintMap, deriveSchemaAuditFields } from './schema';

describe('deriveExtractionHintMap', () => {
  it('extracts x-extraction-hint by field path', () => {
    const schema = {
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
        department: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              'x-extraction-hint': 'Use the department code label',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const map = deriveExtractionHintMap(schema);

    expect(map['invoice.po_no']).toBe('Top right, 7 digits');
    expect(map['department.code']).toBe('Use the department code label');
  });

  it('ignores schema nodes stored at the root (outside properties)', () => {
    const schema = {
      type: 'object',
      invoice: {
        type: 'object',
        properties: {
          po_no: {
            type: 'string',
            'x-extraction-hint': 'Root-level invoice schema',
          },
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cost: {
              type: 'string',
              'x-extraction-hint': 'Root-level items schema',
            },
          },
        },
      },
      properties: {
        department: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              'x-extraction-hint': 'Department code',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const map = deriveExtractionHintMap(schema);

    expect(map['invoice.po_no']).toBeUndefined();
    expect(map['items[].cost']).toBeUndefined();
    expect(map['department.code']).toBe('Department code');
  });

  it('resolves local $ref pointers', () => {
    const schema = {
      type: 'object',
      $defs: {
        invoiceSchema: {
          type: 'object',
          properties: {
            po_no: {
              type: 'string',
              'x-extraction-hint': 'From the header, 7 digits',
            },
          },
        },
      },
      properties: {
        invoice: {
          $ref: '#/$defs/invoiceSchema',
        },
      },
    } as unknown as Record<string, unknown>;

    const map = deriveExtractionHintMap(schema);

    expect(map['invoice.po_no']).toBe('From the header, 7 digits');
  });
});

describe('deriveSchemaAuditFields', () => {
  it('derives leaf fields from schemas that use $ref', () => {
    const schema = {
      type: 'object',
      definitions: {
        Department: {
          type: 'object',
          properties: {
            code: { type: 'string', title: 'Department Code' },
          },
        },
      },
      properties: {
        department: {
          $ref: '#/definitions/Department',
        },
      },
    } as unknown as Record<string, unknown>;

    const fields = deriveSchemaAuditFields(schema);

    expect(fields.scalarFields.some((field) => field.path === 'department.code')).toBe(true);
  });
});
