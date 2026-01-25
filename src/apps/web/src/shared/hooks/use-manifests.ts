import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { manifestsApi, Manifest, ManifestListResponse, UpdateManifestDto } from '@/api/manifests';
import { ManifestListQueryParams } from '@/shared/types/manifests';
import { useJobsStore } from '@/shared/stores/jobs';

export function useManifests(groupId: number, params?: ManifestListQueryParams) {
  return useQuery<ManifestListResponse>({
    queryKey: ['manifests', 'group', groupId, params],
    queryFn: () => manifestsApi.listManifests(groupId, params),
    placeholderData: keepPreviousData,
  });
}

export function useManifest(manifestId: number, options: { enabled?: boolean } = {}) {
  return useQuery<Manifest>({
    queryKey: ['manifests', manifestId],
    queryFn: () => manifestsApi.getManifest(manifestId),
    enabled: (options.enabled ?? true) && manifestId > 0,
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

export function useDeleteManifestsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, manifestIds }: { groupId: number; manifestIds: number[] }) =>
      manifestsApi.deleteManifestsBulk(groupId, manifestIds),
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
      const now = new Date().toISOString();
      useJobsStore.getState().upsertJob({
        id: String(data.jobId),
        kind: 'extraction',
        manifestId: variables.manifestId,
        status: 'waiting',
        progress: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
      if (!data.jobId) {
        return;
      }
      const now = new Date().toISOString();
      useJobsStore.getState().upsertJob({
        id: String(data.jobId),
        kind: 'extraction',
        manifestId: variables.manifestId,
        status: 'waiting',
        progress: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
      const now = new Date().toISOString();
      useJobsStore.getState().upsertJob({
        id: String(data.jobId),
        kind: 'extraction',
        manifestId: variables.manifestId,
        status: 'waiting',
        progress: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
      });
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

export function useQueueOcrRefreshJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ manifestId, textExtractorId }: { manifestId: number; textExtractorId?: string }) =>
      manifestsApi.queueOcrRefreshJob(manifestId, { textExtractorId }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
      const now = new Date().toISOString();
      useJobsStore.getState().upsertJob({
        id: String(data.jobId),
        kind: 'ocr',
        manifestId: variables.manifestId,
        status: 'waiting',
        progress: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
      });
    },
  });
}

export function useRefreshOcrResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ manifestId, textExtractorId }: { manifestId: number; textExtractorId?: string }) =>
      manifestsApi.refreshOcrResult(manifestId, { textExtractorId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocr', variables.manifestId] });
      queryClient.invalidateQueries({ queryKey: ['manifests', variables.manifestId] });
    },
  });
}

export function useManifestExtractionHistory(manifestId: number, options: { limit?: number; enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: ['manifests', manifestId, 'extraction-history', options.limit],
    queryFn: () => manifestsApi.getExtractionHistory(manifestId, { limit: options.limit }),
    enabled: enabled && manifestId > 0,
  });
}

export function useManifestOcrHistory(manifestId: number, options: { limit?: number; enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: ['manifests', manifestId, 'ocr-history', options.limit],
    queryFn: () => manifestsApi.getOcrHistory(manifestId, { limit: options.limit }),
    enabled: enabled && manifestId > 0,
  });
}

export function useManifestExtractionHistoryEntry(
  manifestId: number,
  jobId: number | null,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: ['manifests', manifestId, 'extraction-history', jobId],
    queryFn: () => {
      if (jobId === null) {
        throw new Error('jobId is required');
      }
      return manifestsApi.getExtractionHistoryEntry(manifestId, jobId);
    },
    enabled: enabled && manifestId > 0 && jobId !== null,
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

export function useExportSelectedToCsv() {
  return useMutation({
    mutationFn: (manifestIds: number[]) => manifestsApi.exportSelectedToCsv(manifestIds),
  });
}




