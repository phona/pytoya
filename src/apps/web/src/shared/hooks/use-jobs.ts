import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';

export function useJobHistory(manifestId?: number, limit?: number) {
  return useQuery({
    queryKey: ['jobs', 'history', manifestId, limit],
    queryFn: () => jobsApi.getJobHistory({ manifestId, limit }),
  });
}
