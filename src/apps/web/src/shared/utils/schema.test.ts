import { describe, expect, it } from 'vitest';
import { deriveExtractionHintMap } from './schema';

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
});

