import { SchemasService } from './schemas.service';
import { SchemaEntity } from '../entities/schema.entity';
import { BadRequestException } from '@nestjs/common';

describe('SchemasService', () => {
  let service: SchemasService;
  let schemaRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(() => {
    schemaRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    service = new SchemasService(schemaRepository as any);
  });

  it('validates a JSON schema definition', () => {
    const result = service.validateSchemaDefinition({ type: 'object', properties: {} });

    expect(result.valid).toBe(true);
  });

  it('returns errors for invalid schema definitions', () => {
    const result = service.validateSchemaDefinition({ type: 123 } as unknown as Record<string, unknown>);

    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('validates required fields against data', () => {
    const result = service.validateWithRequiredFields({
      jsonSchema: {
        type: 'object',
        properties: {
          invoice: {
            type: 'object',
            required: ['po_no'],
            properties: {
              po_no: { type: 'string' },
            },
          },
        },
      },
      data: { invoice: {} },
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toMatch(/required property/i);
    expect(result.missingFields).toEqual(['invoice.po_no']);
  });

  it('throws when validation data is missing', () => {
    expect(() => {
      service.validateWithRequiredFields({
        jsonSchema: { type: 'object', properties: {} },
      } as any);
    }).toThrow(BadRequestException);
  });
});
