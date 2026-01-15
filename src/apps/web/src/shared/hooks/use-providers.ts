import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi, CreateProviderDto, UpdateProviderDto } from '@/api/providers';

export function useProviders() {
  const queryClient = useQueryClient();

  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.listProviders,
  });

  const createProvider = useMutation({
    mutationFn: (data: CreateProviderDto) => providersApi.createProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

  const updateProvider = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProviderDto }) =>
      providersApi.updateProvider(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['provider', variables.id] });
    },
  });

  const deleteProvider = useMutation({
    mutationFn: (id: number) => providersApi.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

  return {
    providers: providers.data ?? [],
    isLoading: providers.isLoading,
    error: providers.error,
    createProvider: createProvider.mutateAsync,
    updateProvider: updateProvider.mutateAsync,
    deleteProvider: deleteProvider.mutateAsync,
    isCreating: createProvider.isPending,
    isUpdating: updateProvider.isPending,
    isDeleting: deleteProvider.isPending,
  };
}
