import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';
import type {
  CreateModelDto,
  ModelResponseDto,
  UpdateModelDto,
  TestModelResponseDto,
  UpdateModelPricingDto,
} from '@pytoya/shared/types/models';

export type AdapterCategory = 'ocr' | 'llm';

export type ParameterType = 'string' | 'number' | 'boolean' | 'enum';

export interface ParameterDefinition {
  type: ParameterType;
  required: boolean;
  default?: unknown;
  label: string;
  placeholder?: string;
  secret?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  helpText?: string;
}

export interface AdapterSchema {
  type: string;
  name: string;
  description: string;
  category: AdapterCategory;
  parameters: Record<string, ParameterDefinition>;
  capabilities: string[];
}

export type Model = Jsonify<ModelResponseDto>;
export type { CreateModelDto, UpdateModelDto };
export type TestModelResponse = TestModelResponseDto;

export const modelsApi = {
  listModels: async (params?: {
    category?: AdapterCategory;
    adapterType?: string;
    isActive?: boolean;
  }) => {
    const response = await apiClient.get<Model[]>('/models', {
      params,
    });
    return response.data;
  },

  getAdapters: async () => {
    const response = await apiClient.get<AdapterSchema[]>('/models/adapters');
    return response.data;
  },

  createModel: async (data: CreateModelDto) => {
    const response = await apiClient.post<Model>('/models', data);
    return response.data;
  },

  updateModel: async (id: string, data: UpdateModelDto) => {
    const response = await apiClient.patch<Model>(`/models/${id}`, data);
    return response.data;
  },

  updateModelPricing: async (id: string, pricing: UpdateModelPricingDto['pricing']) => {
    const response = await apiClient.patch<Model>(`/models/${id}/pricing`, { pricing });
    return response.data;
  },

  deleteModel: async (id: string) => {
    await apiClient.delete(`/models/${id}`);
  },

  testConnection: async (id: string) => {
    const response = await apiClient.post<TestModelResponse>(`/models/${id}/test`);
    return response.data;
  },
};




