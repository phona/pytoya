import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateExtractorDto,
  UpdateExtractorDto,
  extractorsApi,
} from '@/api/extractors';

export function useExtractors(filters?: { extractorType?: string; isActive?: boolean }) {
  const query = useQuery({
    queryKey: ['extractors', filters ?? {}],
    queryFn: () => extractorsApi.listExtractors(filters),
  });

  return {
    extractors: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useExtractorTypes() {
  const query = useQuery({
    queryKey: ['extractor-types'],
    queryFn: extractorsApi.getTypes,
  });

  return {
    types: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useExtractorPresets() {
  const query = useQuery({
    queryKey: ['extractor-presets'],
    queryFn: extractorsApi.getPresets,
  });

  return {
    presets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useExtractorMutations() {
  const queryClient = useQueryClient();

  const createExtractor = useMutation({
    mutationFn: (data: CreateExtractorDto) => extractorsApi.createExtractor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extractors'] });
    },
  });

  const updateExtractor = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExtractorDto }) =>
      extractorsApi.updateExtractor(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['extractors'] });
      queryClient.invalidateQueries({ queryKey: ['extractor', variables.id] });
    },
  });

  const deleteExtractor = useMutation({
    mutationFn: (id: string) => extractorsApi.deleteExtractor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extractors'] });
    },
  });

  const testExtractor = useMutation({
    mutationFn: (id: string) => extractorsApi.testExtractor(id),
  });

  return {
    createExtractor: createExtractor.mutateAsync,
    updateExtractor: updateExtractor.mutateAsync,
    deleteExtractor: deleteExtractor.mutateAsync,
    testExtractor: testExtractor.mutateAsync,
    isCreating: createExtractor.isPending,
    isUpdating: updateExtractor.isPending,
    isDeleting: deleteExtractor.isPending,
    isTesting: testExtractor.isPending,
  };
}
