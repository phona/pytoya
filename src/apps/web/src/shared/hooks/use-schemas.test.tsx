import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, type Mock } from 'vitest';
import {
  schemasApi,
  type CreateSchemaDto,
  type CreateSchemaRuleDto,
  type GenerateRulesDto,
  type GenerateSchemaDto,
  type ImportSchemaDto,
  type ValidateSchemaDto,
  SchemaRuleOperator,
  SchemaRuleType,
} from '@/api/schemas';
import {
  useSchemas,
  useSchema,
  useProjectSchemas,
  useSchemaRules,
  useGenerateSchema,
  useGenerateRules,
  useImportSchema,
  useValidateSchemaDefinition,
  useValidateWithRequired,
} from './use-schemas';

vi.mock('@/api/schemas', async () => {
  const actual = await vi.importActual<typeof import('@/api/schemas')>('@/api/schemas');
  return {
    ...actual,
    schemasApi: {
      listSchemas: vi.fn(),
      getSchema: vi.fn(),
      getProjectSchemas: vi.fn(),
      listSchemaRules: vi.fn(),
      createSchemaRule: vi.fn(),
      updateSchemaRule: vi.fn(),
      deleteSchemaRule: vi.fn(),
      generateSchema: vi.fn(),
      generateRules: vi.fn(),
      importSchema: vi.fn(),
      validateSchemaDefinition: vi.fn(),
      validateWithRequired: vi.fn(),
      createSchema: vi.fn(),
      updateSchema: vi.fn(),
      deleteSchema: vi.fn(),
    },
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const baseSchema = {
  id: 1,
  name: 'Invoice Schema',
  projectId: 1,
  jsonSchema: { type: 'object', required: ['invoice_number'], properties: {} },
  requiredFields: ['invoice_number'],
  description: 'Invoice extraction schema',
  systemPromptTemplate: null,
  validationSettings: null,
  createdAt: '2025-01-13T00:00:00.000Z',
  updatedAt: '2025-01-13T00:00:00.000Z',
};

describe('useSchemas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSchemas query', () => {
    it('should fetch schemas successfully', async () => {
      (schemasApi.listSchemas as Mock).mockResolvedValue([baseSchema]);

      const { result } = renderHook(() => useSchemas(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.schemas).toEqual([baseSchema]);
      expect(schemasApi.listSchemas).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      (schemasApi.listSchemas as Mock).mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useSchemas(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('createSchema mutation', () => {
    it('should create schema successfully', async () => {
      const newSchema: CreateSchemaDto = {
        projectId: 1,
        jsonSchema: { type: 'object', required: ['total'], properties: {} },
      };

      const createdSchema = {
        ...baseSchema,
        id: 2,
        ...newSchema,
        systemPromptTemplate: null,
        validationSettings: null,
      };

      (schemasApi.listSchemas as Mock).mockResolvedValue([]);
      (schemasApi.createSchema as Mock).mockResolvedValue(createdSchema);

      const { result } = renderHook(() => useSchemas(), { wrapper: createWrapper() });

      await result.current.createSchema(newSchema);

      expect(schemasApi.createSchema).toHaveBeenCalledWith(newSchema);
    });
  });

  describe('updateSchema mutation', () => {
    it('should update schema successfully', async () => {
      const updateData = {
        jsonSchema: { type: 'object', properties: { updated: true } },
      };

      const updatedSchema = {
        ...baseSchema,
        ...updateData,
      };

      (schemasApi.listSchemas as Mock).mockResolvedValue([]);
      (schemasApi.updateSchema as Mock).mockResolvedValue(updatedSchema);

      const { result } = renderHook(() => useSchemas(), { wrapper: createWrapper() });

      await result.current.updateSchema({ id: 1, data: updateData });

      expect(schemasApi.updateSchema).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe('deleteSchema mutation', () => {
    it('should delete schema successfully', async () => {
      (schemasApi.listSchemas as Mock).mockResolvedValue([]);
      (schemasApi.deleteSchema as Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSchemas(), { wrapper: createWrapper() });

      await result.current.deleteSchema(1);

      expect(schemasApi.deleteSchema).toHaveBeenCalledWith(1);
    });
  });
});

describe('useSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single schema successfully', async () => {
    (schemasApi.getSchema as Mock).mockResolvedValue(baseSchema);

    const { result } = renderHook(() => useSchema(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.schema).toEqual(baseSchema);
    expect(schemasApi.getSchema).toHaveBeenCalledWith(1);
  });

  it('should not fetch when id is not provided', async () => {
    const { result } = renderHook(() => useSchema(0), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(schemasApi.getSchema).not.toHaveBeenCalled();
  });
});

describe('useProjectSchemas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch project schemas successfully', async () => {
    const projectSchema = {
      ...baseSchema,
      id: 3,
      projectId: 5,
      name: 'Project Schema 1',
      description: null,
    };

    (schemasApi.getProjectSchemas as Mock).mockResolvedValue([projectSchema]);

    const { result } = renderHook(() => useProjectSchemas(5), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.schemas).toEqual([projectSchema]);
    expect(schemasApi.getProjectSchemas).toHaveBeenCalledWith(5);
  });
});

describe('useSchemaRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseRule = {
    id: 10,
    schemaId: 1,
    fieldPath: 'invoice.po_no',
    ruleType: SchemaRuleType.VERIFICATION,
    ruleOperator: SchemaRuleOperator.PATTERN,
    ruleConfig: { pattern: '^\\d{7}$' },
    errorMessage: 'PO number must be 7 digits',
    priority: 7,
    enabled: true,
    description: null,
    createdAt: '2025-01-13T00:00:00.000Z',
  };

  it('should fetch schema rules successfully', async () => {
    (schemasApi.listSchemaRules as Mock).mockResolvedValue([baseRule]);

    const { result } = renderHook(() => useSchemaRules(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rules).toEqual([baseRule]);
    expect(schemasApi.listSchemaRules).toHaveBeenCalledWith(1);
  });

  it('should create a rule successfully', async () => {
    const rulePayload: CreateSchemaRuleDto = {
      schemaId: 1,
      fieldPath: 'invoice.po_no',
      ruleType: SchemaRuleType.VERIFICATION,
      ruleOperator: SchemaRuleOperator.PATTERN,
      ruleConfig: { pattern: '^\\d{7}$' },
      priority: 7,
    };

    (schemasApi.listSchemaRules as Mock).mockResolvedValue([]);
    (schemasApi.createSchemaRule as Mock).mockResolvedValue(baseRule);

    const { result } = renderHook(() => useSchemaRules(1), { wrapper: createWrapper() });

    await result.current.createRule(rulePayload);

    expect(schemasApi.createSchemaRule).toHaveBeenCalledWith(1, rulePayload);
  });

  it('should update a rule successfully', async () => {
    const updatePayload = {
      ruleId: 10,
      data: { enabled: false },
    };

    (schemasApi.listSchemaRules as Mock).mockResolvedValue([]);
    (schemasApi.updateSchemaRule as Mock).mockResolvedValue({ ...baseRule, enabled: false });

    const { result } = renderHook(() => useSchemaRules(1), { wrapper: createWrapper() });

    await result.current.updateRule(updatePayload);

    expect(schemasApi.updateSchemaRule).toHaveBeenCalledWith(1, 10, updatePayload.data);
  });

  it('should delete a rule successfully', async () => {
    (schemasApi.listSchemaRules as Mock).mockResolvedValue([]);
    (schemasApi.deleteSchemaRule as Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSchemaRules(1), { wrapper: createWrapper() });

    await result.current.deleteRule(10);

    expect(schemasApi.deleteSchemaRule).toHaveBeenCalledWith(1, 10);
  });
});

describe('useGenerateSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate schema successfully', async () => {
    const payload: GenerateSchemaDto = {
      modelId: 'llm-1',
      description: 'Generate invoice schema',
      includeExtractionHints: true,
    };

    const response = { jsonSchema: { type: 'object' } };
    (schemasApi.generateSchema as Mock).mockResolvedValue(response);

    const { result } = renderHook(() => useGenerateSchema(), { wrapper: createWrapper() });

    const output = await result.current.mutateAsync(payload);

    expect(output).toEqual(response);
    expect(schemasApi.generateSchema).toHaveBeenCalledWith(payload);
  });
});

describe('useGenerateRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate rules successfully', async () => {
    const payload: GenerateRulesDto = {
      modelId: 'llm-1',
      description: 'Generate rules',
      jsonSchema: { type: 'object' },
    };

    const response = { rules: [] };
    (schemasApi.generateRules as Mock).mockResolvedValue(response);

    const { result } = renderHook(() => useGenerateRules(1), { wrapper: createWrapper() });

    const output = await result.current.mutateAsync(payload);

    expect(output).toEqual(response);
    expect(schemasApi.generateRules).toHaveBeenCalledWith(1, payload);
  });
});

describe('useImportSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import schema successfully', async () => {
    const payload: ImportSchemaDto = {
      file: new File(['{}'], 'schema.json', { type: 'application/json' }),
    };

    const response = { valid: true, jsonSchema: { type: 'object' } };
    (schemasApi.importSchema as Mock).mockResolvedValue(response);

    const { result } = renderHook(() => useImportSchema(), { wrapper: createWrapper() });

    const output = await result.current.mutateAsync(payload);

    expect(output).toEqual(response);
    expect(schemasApi.importSchema).toHaveBeenCalledWith(payload);
  });
});

describe('useValidateSchemaDefinition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate schema definition successfully', async () => {
    const validationResult = {
      valid: true,
      errors: undefined,
    };

    (schemasApi.validateSchemaDefinition as Mock).mockResolvedValue(validationResult);

    const { result } = renderHook(() => useValidateSchemaDefinition(), { wrapper: createWrapper() });

    const validateDto: ValidateSchemaDto = {
      jsonSchema: { type: 'object' },
    };

    const output = await result.current.mutateAsync(validateDto);

    expect(output).toEqual(validationResult);
    expect(schemasApi.validateSchemaDefinition).toHaveBeenCalledWith(validateDto);
  });
});

  describe('useValidateWithRequired', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should validate schema with required fields', async () => {
      const validationResult = {
        valid: false,
        errors: ['Required field missing'],
      };

    (schemasApi.validateWithRequired as Mock).mockResolvedValue(validationResult);

    const { result } = renderHook(() => useValidateWithRequired(), { wrapper: createWrapper() });

      const validateDto: ValidateSchemaDto = {
        jsonSchema: { type: 'object', required: ['invoice_number'] },
        data: {},
      };

    const output = await result.current.mutateAsync(validateDto);

    expect(output).toEqual(validationResult);
    expect(schemasApi.validateWithRequired).toHaveBeenCalledWith(validateDto);
  });
});




