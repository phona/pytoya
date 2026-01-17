import apiClient from '@/api/client';

export type OptimizePromptDto = {
  description: string;
};

export type OptimizePromptResponse = {
  prompt: string;
};

export const extractionApi = {
  optimizePrompt: async (data: OptimizePromptDto) => {
    const response = await apiClient.post<OptimizePromptResponse>(
      '/extraction/optimize-prompt',
      data,
    );
    return response.data;
  },
};
