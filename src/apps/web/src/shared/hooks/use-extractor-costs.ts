import { useQuery } from '@tanstack/react-query';
import { extractorsApi } from '@/api/extractors';
import { projectsApi } from '@/api/projects';

export function useExtractorCostSummary(extractorId?: string) {
  const query = useQuery({
    queryKey: ['extractor-cost-summary', extractorId],
    queryFn: () => (extractorId ? extractorsApi.getCostSummary(extractorId) : Promise.resolve(null)),
    enabled: Boolean(extractorId),
  });

  return {
    summary: query.data ?? undefined,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useProjectCostSummary(projectId?: number, dateRange?: { from?: string; to?: string }) {
  const query = useQuery({
    queryKey: ['project-cost-summary', projectId, dateRange ?? {}],
    queryFn: () => (projectId ? projectsApi.getProjectCostSummary(projectId, dateRange) : Promise.resolve(null)),
    enabled: Boolean(projectId),
  });

  return {
    summary: query.data ?? undefined,
    isLoading: query.isLoading,
    error: query.error,
  };
}
