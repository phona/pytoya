import { useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

export interface PendingCropItem {
  field: string;
  page: number;
  cropImage: string;
  ocrText: string;
  confidence: number;
  reason: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface PendingCropsResponse {
  items: PendingCropItem[];
  total: number;
}

export interface VerifyCropBody {
  field: string;
  page: number;
  correctedText: string;
  adjustedBbox?: { x: number; y: number; width: number; height: number };
}

export function usePendingCrops(manifestId: number, threshold = 0.8) {
  return useQuery<PendingCropsResponse>({
    queryKey: ['pending-crops', manifestId, threshold],
    queryFn: () =>
      apiClient
        .get(`/manifests/${manifestId}/pending-crops`, {
          params: { threshold },
        })
        .then((r) => r.data),
    enabled: manifestId > 0,
  });
}

export function useVerifyCrop(manifestId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: VerifyCropBody) =>
      apiClient.post(`/manifests/${manifestId}/crops/verify`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-crops', manifestId] });
    },
  });
}

export function usePageImage(manifestId: number, page: number) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manifestId || !page) return;

    let canceled = false;
    let urlToRevoke: string | null = null;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<Blob>(
          `/manifests/${manifestId}/pages/${page}/image`,
          { responseType: 'blob' },
        );
        if (canceled) return;
        const nextUrl = URL.createObjectURL(response.data);
        urlToRevoke = nextUrl;
        setObjectUrl(nextUrl);
      } catch (err) {
        if (canceled) return;
        setError(err instanceof Error ? err.message : 'Failed to load page image');
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    void run();

    return () => {
      canceled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [manifestId, page]);

  return { objectUrl, isLoading, error };
}

export function useCropImageUrl(cropImage: string) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!cropImage) return;

    if (cropImage.startsWith('data:')) {
      setObjectUrl(cropImage);
      return;
    }

    let canceled = false;
    let urlToRevoke: string | null = null;

    const run = async () => {
      try {
        const response = await apiClient.get<Blob>(cropImage, { responseType: 'blob' });
        if (canceled) return;
        const nextUrl = URL.createObjectURL(response.data);
        urlToRevoke = nextUrl;
        setObjectUrl(nextUrl);
      } catch {
        setObjectUrl(null);
      }
    };

    void run();

    return () => {
      canceled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [cropImage]);

  return objectUrl;
}
