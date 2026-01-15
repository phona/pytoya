import apiClient from '@/api/client';

export type ProviderType = 'PADDLEX' | 'OPENAI' | 'CUSTOM' | 'ANTHROPIC' | 'BAIDU' | 'SILICONFLOW';

export interface Provider {
  id: number;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  modelName?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderDto {
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsStructuredOutput?: boolean;
}

export interface UpdateProviderDto {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsStructuredOutput?: boolean;
  isDefault?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  latency?: number;
}

export const providersApi = {
  listProviders: async () => {
    const response = await apiClient.get<Provider[]>('/providers');
    return response.data;
  },

  getProvider: async (id: number) => {
    const response = await apiClient.get<Provider>(`/providers/${id}`);
    return response.data;
  },

  createProvider: async (data: CreateProviderDto) => {
    const response = await apiClient.post<Provider>('/providers', data);
    return response.data;
  },

  updateProvider: async (id: number, data: UpdateProviderDto) => {
    const response = await apiClient.patch<Provider>(`/providers/${id}`, data);
    return response.data;
  },

  deleteProvider: async (id: number) => {
    await apiClient.delete(`/providers/${id}`);
  },

  testConnection: async (id: number) => {
    const response = await apiClient.post<TestConnectionResponse>(`/providers/${id}/test`);
    return response.data;
  },
};
