import { SchemasService } from './schemas.service';
import { SchemaEntity } from '../entities/schema.entity';
import { BadRequestException } from '@nestjs/common';
import { AbilityFactory } from '../auth/casl/ability.factory';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';

describe('SchemasService', () => {
  let service: SchemasService;
  let schemaRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let projectRepository: { findOne: jest.Mock; update: jest.Mock };
  let schemaRuleRepository: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let manifestRepository: { query: jest.Mock };
  let abilityFactory: { createForUser: jest.Mock; subject: jest.Mock };

  beforeEach(() => {
    schemaRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    projectRepository = { findOne: jest.fn(), update: jest.fn() };
    schemaRuleRepository = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
    manifestRepository = { query: jest.fn() };
    abilityFactory = {
      createForUser: jest.fn().mockReturnValue({ can: () => true }),
      subject: jest.fn((_type: string, payload: Record<string, unknown>) => payload),
    };

    service = new SchemasService(
      schemaRepository as any,
      projectRepository as any,
      schemaRuleRepository as any,
      manifestRepository as any,
      abilityFactory as any as AbilityFactory,
    );
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

  it('denies schema creation for unauthorized user', async () => {
    abilityFactory.createForUser.mockReturnValue({ can: () => false });
    projectRepository.findOne.mockResolvedValue({ id: 10, ownerId: 2, defaultSchemaId: null });

    await expect(
      service.createWithManager(
        { id: 1, role: 'user' } as any,
        { projectId: 10, jsonSchema: { type: 'object', properties: {} } } as any,
      ),
    ).rejects.toBeInstanceOf(ProjectOwnershipException);
  });
});
