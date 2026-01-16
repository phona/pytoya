import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { manifestsApi, UpdateManifestDto } from '@/api/manifests';

export function useManifests(groupId: number) {
  return useQuery({
    queryKey: ['manifests', 'group', groupId],
    queryFn: () => manifestsApi.listManifests(groupId),
  });
}

export function useManifest(manifestId: number) {
  return useQuery({
    queryKey: ['manifests', manifestId],
    queryFn: () => manifestsApi.getManifest(manifestId),
  });
}

export function useManifestItems(manifestId: number) {
  return useQuery({
    queryKey: ['manifests', manifestId, 'items'],
    queryFn: () => manifestsApi.getManifestItems(manifestId),
  });
}

export function useUpdateManifest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ manifestId, data }: { manifestId: number; data: UpdateManifestDto }) =>
      manifestsApi.updateManifest(manifestId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
      queryClient.invalidateQueries({ queryKey: ['manifests', 'group'] });
    },
  });
}

export function useDeleteManifest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (manifestId: number) => manifestsApi.deleteManifest(manifestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifests', 'group'] });
    },
  });
}

export function useReExtractField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      manifestId,
      fieldName,
      llmModelId,
      promptId,
    }: {
      manifestId: number;
      fieldName: string;
      llmModelId?: string;
      promptId?: number;
    }) => manifestsApi.reExtractField(manifestId, fieldName, llmModelId, promptId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
    },
  });
}

export function useTriggerExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      manifestId,
      llmModelId,
      promptId,
    }: {
      manifestId: number;
      llmModelId?: string;
      promptId?: number;
    }) => manifestsApi.triggerExtraction(manifestId, llmModelId, promptId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
    },
  });
}

export function useExportSelectedToCsv() {
  return useMutation({
    mutationFn: (manifestIds: number[]) => manifestsApi.exportSelectedToCsv(manifestIds),
  });
}
