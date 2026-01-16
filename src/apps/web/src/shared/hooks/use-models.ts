import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdapterCategory,
  AdapterSchema,
  CreateModelDto,
  UpdateModelDto,
  modelsApi,
} from '@/api/models';

export function useModels(filters?: {
  category?: AdapterCategory;
  adapterType?: string;
  isActive?: boolean;
}) {
  const models = useQuery({
    queryKey: ['models', filters ?? {}],
    queryFn: () => modelsApi.listModels(filters),
  });

  return {
    models: models.data ?? [],
    isLoading: models.isLoading,
    error: models.error,
  };
}

export function useModelAdapters() {
  const adapters = useQuery({
    queryKey: ['model-adapters'],
    queryFn: modelsApi.getAdapters,
  });

  return {
    adapters: adapters.data ?? [],
    isLoading: adapters.isLoading,
    error: adapters.error,
  };
}

export function useModelMutations() {
  const queryClient = useQueryClient();

  const createModel = useMutation({
    mutationFn: (data: CreateModelDto) => modelsApi.createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  const updateModel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModelDto }) =>
      modelsApi.updateModel(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['model', variables.id] });
    },
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) => modelsApi.deleteModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  const testModel = useMutation({
    mutationFn: (id: string) => modelsApi.testConnection(id),
  });

  return {
    createModel: createModel.mutateAsync,
    updateModel: updateModel.mutateAsync,
    deleteModel: deleteModel.mutateAsync,
    testModel: testModel.mutateAsync,
    isCreating: createModel.isPending,
    isUpdating: updateModel.isPending,
    isDeleting: deleteModel.isPending,
    isTesting: testModel.isPending,
  };
}

export const getAdapterByType = (
  adapters: AdapterSchema[],
  adapterType?: string,
): AdapterSchema | undefined =>
  adapters.find((adapter) => adapter.type === adapterType);
