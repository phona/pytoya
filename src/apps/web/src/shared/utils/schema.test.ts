import { describe, expect, it } from 'vitest';
import {
  canonicalizeJsonSchemaForDisplay,
  deriveExtractionHintMap,
  deriveSchemaAuditFields,
  deriveSchemaTableColumns,
  isSchemaReadyForRules,
} from './schema';

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

  it('orders root properties by x-ui-order then name', () => {
    const schema = {
      type: 'object',
      properties: {
        beta: { type: 'string' },
        alpha: { type: 'string', 'x-ui-order': 1 },
      },
    } as unknown as Record<string, unknown>;

    const fields = deriveSchemaAuditFields(schema);
    expect(fields.scalarFields.map((field) => field.path)).toEqual(['alpha', 'beta']);
  });

  it('falls back to name ordering when x-ui-order is missing', () => {
    const schema = {
      type: 'object',
      properties: {
        beta: { type: 'string' },
        alpha: { type: 'string' },
      },
    } as unknown as Record<string, unknown>;

    const fields = deriveSchemaAuditFields(schema);
    expect(fields.scalarFields.map((field) => field.path)).toEqual(['alpha', 'beta']);
  });

  it('orders nested object properties', () => {
    const schema = {
      type: 'object',
      properties: {
        invoice: {
          type: 'object',
          properties: {
            z: { type: 'string' },
            a: { type: 'string', 'x-ui-order': 1 },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const fields = deriveSchemaAuditFields(schema);
    expect(fields.scalarFields.map((field) => field.path)).toEqual(['invoice.a', 'invoice.z']);
  });

  it('orders array item object properties', () => {
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              z: { type: 'string' },
              a: { type: 'string', 'x-ui-order': 1 },
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const fields = deriveSchemaAuditFields(schema);
    expect(fields.arrayObjectFields).toHaveLength(1);
    expect(fields.arrayObjectFields[0]?.itemFields.map((field) => field.path)).toEqual(['items[].a', 'items[].z']);
  });
});

describe('isSchemaReadyForRules', () => {
  it('returns false for missing schema', () => {
    expect(isSchemaReadyForRules(null)).toBe(false);
  });

  it('returns false for an empty object schema', () => {
    expect(isSchemaReadyForRules({
      jsonSchema: { type: 'object', properties: {}, required: [] },
      requiredFields: [],
    })).toBe(false);
  });

  it('returns true when properties contain fields', () => {
    expect(isSchemaReadyForRules({
      jsonSchema: { type: 'object', properties: { invoiceNo: { type: 'string' } }, required: [] },
      requiredFields: [],
    })).toBe(true);
  });

  it('returns true when requiredFields is populated', () => {
    expect(isSchemaReadyForRules({
      jsonSchema: { type: 'object', properties: {}, required: [] },
      requiredFields: ['invoiceNo'],
    })).toBe(true);
  });
});

describe('deriveSchemaTableColumns', () => {
  it('uses x-table-columns order and ignores array paths', () => {
    const schema = {
      type: 'object',
      properties: {
        invoice: {
          type: 'object',
          properties: {
            po_no: { type: 'string', title: 'PO #' },
          },
        },
        department: {
          type: 'object',
          properties: {
            code: { type: 'string', title: 'Dept' },
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              desc: { type: 'string', title: 'Desc' },
            },
          },
        },
      },
      'x-table-columns': ['invoice.po_no', 'items[].desc', 'department.code'],
    } as unknown as Record<string, unknown>;

    const columns = deriveSchemaTableColumns(schema, { fallbackLimit: 4 });

    expect(columns.map((col) => col.path)).toEqual(['invoice.po_no', 'department.code']);
    expect(columns[0]?.title).toBe('PO #');
    expect(columns[1]?.title).toBe('Dept');
  });

  it('treats empty x-table-columns as an explicit opt-out', () => {
    const schema = {
      type: 'object',
      properties: {
        invoice: {
          type: 'object',
          properties: { po_no: { type: 'string', title: 'PO #' } },
        },
      },
      'x-table-columns': [],
    } as unknown as Record<string, unknown>;

    expect(deriveSchemaTableColumns(schema).map((col) => col.path)).toEqual([]);
  });

  it('falls back to a small required-first selection when x-table-columns is absent', () => {
    const schema = {
      type: 'object',
      required: ['vendor'],
      properties: {
        _internal: { type: 'string' },
        invoice: {
          type: 'object',
          required: ['po_no'],
          properties: {
            po_no: { type: 'string', title: 'PO No' },
            notes: { type: 'string' },
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              desc: { type: 'string' },
            },
          },
        },
        vendor: { type: 'string', title: 'Vendor' },
      },
    } as unknown as Record<string, unknown>;

    const columns = deriveSchemaTableColumns(schema, { fallbackLimit: 2 });
    expect(columns.map((col) => col.path)).toEqual(['invoice.po_no', 'vendor']);
  });
});

describe('canonicalizeJsonSchemaForDisplay', () => {
  it('canonicalizes properties order recursively', () => {
    const schema = {
      type: 'object',
      properties: {
        beta: { type: 'string' },
        alpha: { type: 'string', 'x-ui-order': 2 },
        gamma: { type: 'string', 'x-ui-order': 1 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              z: { type: 'string' },
              a: { type: 'string', 'x-ui-order': 1 },
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const canonical = canonicalizeJsonSchemaForDisplay(schema);
    const rootProps = canonical.properties as Record<string, unknown>;
    expect(Object.keys(rootProps)).toEqual(['gamma', 'alpha', 'beta', 'items']);

    const itemsSchema = (rootProps.items as Record<string, unknown>).items as Record<string, unknown>;
    const itemProps = itemsSchema.properties as Record<string, unknown>;
    expect(Object.keys(itemProps)).toEqual(['a', 'z']);
  });
});
