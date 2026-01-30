import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';

export function useJobsStats(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['jobs', 'stats'],
    queryFn: () => jobsApi.getJobStats(),
    enabled: options.enabled ?? true,
  });
}

export function useJobHistory(
  manifestId?: number,
  limit?: number,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['jobs', 'history', manifestId, limit],
    queryFn: () => jobsApi.getJobHistory({ manifestId, limit }),
    enabled: options.enabled ?? true,
  });
}
