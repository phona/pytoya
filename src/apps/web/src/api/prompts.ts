import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';
import type {
  CreatePromptDto,
  PromptResponseDto,
  UpdatePromptDto,
} from '@pytoya/shared/types/prompts';

export type Prompt = Jsonify<PromptResponseDto>;
export type PromptType = CreatePromptDto['type'];
export type { CreatePromptDto, UpdatePromptDto };

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
