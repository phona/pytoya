import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';

export interface JobHistoryDto {
  id: number;
  manifestId: number;
  status: string;
  llmModelId: string | null;
  promptId: number | null;
  queueJobId: string | null;
  progress: number;
  estimatedCost: number | null;
  actualCost: number | null;
  error: string | null;
  attemptCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export type JobHistory = Jsonify<JobHistoryDto>;

export const jobsApi = {
  getJobHistory: async (params?: { manifestId?: number; limit?: number }) => {
    const response = await apiClient.get<JobHistory[]>('/jobs/history', {
      params,
    });
    return response.data;
  },

  cancelJob: async (jobId: string, reason?: string) => {
    const response = await apiClient.post<{ canceled: boolean; removedFromQueue: boolean; state: string }>(
      `/jobs/${jobId}/cancel`,
      { reason },
    );
    return response.data;
  },
};
