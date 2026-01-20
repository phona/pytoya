import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, type Mock } from 'vitest';
import { modelsApi } from '@/api/models';
import { useModelAdapters, useModelMutations, useModels } from './use-models';

vi.mock('@/api/models', () => ({
  modelsApi: {
    listModels: vi.fn(),
    getAdapters: vi.fn(),
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deleteModel: vi.fn(),
    testConnection: vi.fn(),
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

describe('useModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches models', async () => {
    const mockModels = [
      {
        id: 'model-1',
        name: 'LLM Model',
        adapterType: 'openai',
        description: null,
        category: 'llm',
        parameters: {},
        isActive: true,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      },
    ];

    (modelsApi.listModels as Mock).mockResolvedValue(mockModels);

    const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(mockModels);
    expect(modelsApi.listModels).toHaveBeenCalled();
  });

  it('fetches adapters', async () => {
    const mockAdapters = [
      {
        type: 'openai',
        name: 'OpenAI',
        description: 'LLM adapter',
        category: 'llm',
        parameters: {},
        capabilities: ['chat'],
      },
    ];

    (modelsApi.getAdapters as Mock).mockResolvedValue(mockAdapters);

    const { result } = renderHook(() => useModelAdapters(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.adapters).toEqual(mockAdapters);
    expect(modelsApi.getAdapters).toHaveBeenCalled();
  });

  it('creates a model', async () => {
    const newModel = {
      id: 'model-2',
      name: 'New Model',
      adapterType: 'openai',
      description: null,
      category: 'llm',
      parameters: {},
      isActive: true,
      createdAt: '2025-01-13T00:00:00.000Z',
      updatedAt: '2025-01-13T00:00:00.000Z',
    };

    (modelsApi.createModel as Mock).mockResolvedValue(newModel);

    const { result } = renderHook(() => useModelMutations(), { wrapper: createWrapper() });

    await result.current.createModel({
      name: 'New Model',
      adapterType: 'openai',
      parameters: {},
      isActive: true,
    });

    expect(modelsApi.createModel).toHaveBeenCalledWith({
      name: 'New Model',
      adapterType: 'openai',
      parameters: {},
      isActive: true,
    });
  });

  it('updates a model', async () => {
    (modelsApi.updateModel as Mock).mockResolvedValue({});

    const { result } = renderHook(() => useModelMutations(), { wrapper: createWrapper() });

    await result.current.updateModel({
      id: 'model-1',
      data: { name: 'Updated Model' },
    });

    expect(modelsApi.updateModel).toHaveBeenCalledWith('model-1', {
      name: 'Updated Model',
    });
  });

  it('deletes a model', async () => {
    (modelsApi.deleteModel as Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useModelMutations(), { wrapper: createWrapper() });

    await result.current.deleteModel('model-1');

    expect(modelsApi.deleteModel).toHaveBeenCalledWith('model-1');
  });

  it('tests a model connection', async () => {
    (modelsApi.testConnection as Mock).mockResolvedValue({ message: 'OK' });

    const { result } = renderHook(() => useModelMutations(), { wrapper: createWrapper() });

    await result.current.testModel('model-1');

    expect(modelsApi.testConnection).toHaveBeenCalledWith('model-1');
  });
});




