import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { manifestsApi, ManifestListResponse, UpdateManifestDto } from '@/api/manifests';
import { ManifestListQueryParams } from '@/shared/types/manifests';

export function useManifests(groupId: number, params?: ManifestListQueryParams) {
  return useQuery<ManifestListResponse>({
    queryKey: ['manifests', 'group', groupId, params],
    queryFn: () => manifestsApi.listManifests(groupId, params),
    placeholderData: keepPreviousData,
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

export function useReExtractFieldPreview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      manifestId,
      data,
    }: {
      manifestId: number;
      data: Parameters<typeof manifestsApi.reExtractFieldWithPreview>[1];
    }) => manifestsApi.reExtractFieldWithPreview(manifestId, data),
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
    }) => manifestsApi.extractManifest(manifestId, { llmModelId, promptId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
    },
  });
}

export function useTriggerOcr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      manifestId,
      force,
      data,
    }: {
      manifestId: number;
      force?: boolean;
      data?: Parameters<typeof manifestsApi.triggerOcr>[1];
    }) => manifestsApi.triggerOcr(manifestId, data, force),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
      queryClient.invalidateQueries({ queryKey: ['ocr', variables.manifestId] });
    },
  });
}

export function useOcrResult(manifestId: number, enabled = true) {
  return useQuery({
    queryKey: ['ocr', manifestId],
    queryFn: () => manifestsApi.getOcrResult(manifestId),
    enabled: enabled && manifestId > 0,
  });
}

export function useExtractBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof manifestsApi.extractBulk>[0]) =>
      manifestsApi.extractBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifests', 'group'] });
    },
  });
}

export function useCostEstimate() {
  return useMutation({
    mutationFn: ({
      manifestIds,
      llmModelId,
      ocrModelId,
    }: {
      manifestIds: number[];
      llmModelId?: string;
      ocrModelId?: string;
    }) => manifestsApi.getCostEstimate(manifestIds, llmModelId, ocrModelId),
  });
}

export function useExportSelectedToCsv() {
  return useMutation({
    mutationFn: (manifestIds: number[]) => manifestsApi.exportSelectedToCsv(manifestIds),
  });
}




