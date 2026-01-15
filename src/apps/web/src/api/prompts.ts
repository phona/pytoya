import apiClient from '@/api/client';

export type PromptType = 'system' | 're_extract';

export interface Prompt {
  id: number;
  name: string;
  type: PromptType;
  content: string;
  variables?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptDto {
  name: string;
  type: PromptType;
  content: string;
  variables?: string[];
}

export interface UpdatePromptDto {
  name?: string;
  content?: string;
  variables?: string[];
}

export const promptsApi = {
  listPrompts: async () => {
    const response = await apiClient.get<Prompt[]>('/prompts');
    return response.data;
  },

  getPrompt: async (id: number) => {
    const response = await apiClient.get<Prompt>(`/prompts/${id}`);
    return response.data;
  },

  createPrompt: async (data: CreatePromptDto) => {
    const response = await apiClient.post<Prompt>('/prompts', data);
    return response.data;
  },

  updatePrompt: async (id: number, data: UpdatePromptDto) => {
    const response = await apiClient.patch<Prompt>(`/prompts/${id}`, data);
    return response.data;
  },

  deletePrompt: async (id: number) => {
    await apiClient.delete(`/prompts/${id}`);
  },
};
