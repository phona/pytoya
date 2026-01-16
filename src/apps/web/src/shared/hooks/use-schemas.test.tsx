import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, type Mock } from 'vitest';
import { schemasApi, type CreateSchemaDto } from '@/api/schemas';
import { useSchemas, useSchema, useProjectSchemas, useSchemaTemplates, useValidateSchema } from './use-schemas';

vi.mock('@/api/schemas', () => ({
  schemasApi: {
    listSchemas: vi.fn(),
    getSchema: vi.fn(),
    getProjectSchemas: vi.fn(),
    getTemplates: vi.fn(),
    validateSchema: vi.fn(),
    createSchema: vi.fn(),
    updateSchema: vi.fn(),
    deleteSchema: vi.fn(),
  },
}));

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

describe('useSchemas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSchemas query', () => {
    it('should fetch schemas successfully', async () => {
      const mockSchemas = [
        {
          id: 1,
          name: 'Invoice Schema',
          projectId: 1,
          jsonSchema: { type: 'object', properties: {} },
          requiredFields: ['invoice_number'],
          isTemplate: false,
          description: 'Invoice extraction schema',
          createdAt: '2025-01-13T00:00:00.000Z',
          updatedAt: '2025-01-13T00:00:00.000Z',
        },
      ];

      (schemasApi.listSchemas as Mock).mockResolvedValue(mockSchemas);

      const { result } = renderHook(() => useSchemas(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.schemas).toEqual(mockSchemas);
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
        name: 'Receipt Schema',
        projectId: 1,
        jsonSchema: { type: 'object', properties: {} },
        requiredFields: ['total'],
        isTemplate: false,
      };

      const createdSchema = {
        id: 2,
        ...newSchema,
        description: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
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
        name: 'Updated Schema',
        jsonSchema: { type: 'object', properties: { updated: true } },
        requiredFields: ['field1', 'field2'],
      };

      const updatedSchema = {
        id: 1,
        projectId: 1,
        ...updateData,
        isTemplate: false,
        description: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
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
    const mockSchema = {
      id: 1,
      name: 'Invoice Schema',
      projectId: 1,
      jsonSchema: { type: 'object', properties: {} },
      requiredFields: ['invoice_number'],
      isTemplate: false,
      description: 'Invoice extraction schema',
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    };

    (schemasApi.getSchema as Mock).mockResolvedValue(mockSchema);

    const { result } = renderHook(() => useSchema(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.schema).toEqual(mockSchema);
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
    const mockSchemas = [
      {
        id: 1,
        name: 'Project Schema 1',
        projectId: 5,
        jsonSchema: { type: 'object' },
        requiredFields: [],
        isTemplate: false,
        description: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ];

    (schemasApi.getProjectSchemas as Mock).mockResolvedValue(mockSchemas);

    const { result } = renderHook(() => useProjectSchemas(5), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.schemas).toEqual(mockSchemas);
    expect(schemasApi.getProjectSchemas).toHaveBeenCalledWith(5);
  });
});

describe('useSchemaTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch template schemas successfully', async () => {
    const mockTemplates = [
      {
        id: 1,
        name: 'Invoice Template',
        projectId: null,
        jsonSchema: { type: 'object' },
        requiredFields: ['invoice_number'],
        isTemplate: true,
        description: 'Invoice template',
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ];

    (schemasApi.getTemplates as Mock).mockResolvedValue(mockTemplates);

    const { result } = renderHook(() => useSchemaTemplates(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toEqual(mockTemplates);
    expect(schemasApi.getTemplates).toHaveBeenCalled();
  });
});

describe('useValidateSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate schema successfully', async () => {
    const validationResult = {
      valid: true,
      errors: undefined,
    };

    (schemasApi.validateSchema as Mock).mockResolvedValue(validationResult);

    const { result } = renderHook(() => useValidateSchema(), { wrapper: createWrapper() });

    const validateDto = {
      jsonSchema: { type: 'object' },
      data: { field: 'value' },
      requiredFields: [],
    };

    await result.current.mutateAsync(validateDto);

    expect(schemasApi.validateSchema).toHaveBeenCalledWith(validateDto);
    await waitFor(() => {
      expect(result.current.data).toEqual(validationResult);
    });
  });

  it('should return validation errors', async () => {
    const validationResult = {
      valid: false,
      errors: ['Required field missing', 'Type mismatch'],
    };

    (schemasApi.validateSchema as Mock).mockResolvedValue(validationResult);

    const { result } = renderHook(() => useValidateSchema(), { wrapper: createWrapper() });

    const validateDto = {
      jsonSchema: { type: 'object' },
      data: {},
      requiredFields: ['missing_field'],
    };

    const response = await result.current.mutateAsync(validateDto);

    expect(response.valid).toBe(false);
    expect(response.errors).toEqual(['Required field missing', 'Type mismatch']);
  });
});
