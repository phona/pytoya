import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';
import type {
  CreateExtractorDto,
  UpdateExtractorDto,
  ExtractorResponseDto,
  ExtractorTypeDto,
  ExtractorPresetDto,
  ExtractorCostSummaryDto,
  ExtractorParamDefinition,
  ExtractorParamSchema,
  TestExtractorResponseDto,
} from '@pytoya/shared/types/extractors';

export type Extractor = Jsonify<ExtractorResponseDto>;
export type ExtractorType = ExtractorTypeDto;
export type ExtractorPreset = ExtractorPresetDto;
export type ExtractorCostSummary = Jsonify<ExtractorCostSummaryDto>;
export type TestExtractorResponse = TestExtractorResponseDto;
export type {
  CreateExtractorDto,
  UpdateExtractorDto,
  ExtractorParamDefinition,
  ExtractorParamSchema,
};

export const extractorsApi = {
  listExtractors: async (params?: { extractorType?: string; isActive?: boolean }) => {
    const response = await apiClient.get<Extractor[]>('/extractors', { params });
    return response.data;
  },

  getTypes: async () => {
    const response = await apiClient.get<ExtractorType[]>('/extractors/types');
    return response.data;
  },

  getPresets: async () => {
    const response = await apiClient.get<ExtractorPreset[]>('/extractors/presets');
    return response.data;
  },

  createExtractor: async (data: CreateExtractorDto) => {
    const response = await apiClient.post<Extractor>('/extractors', data);
    return response.data;
  },

  updateExtractor: async (id: string, data: UpdateExtractorDto) => {
    const response = await apiClient.patch<Extractor>(`/extractors/${id}`, data);
    return response.data;
  },

  deleteExtractor: async (id: string) => {
    await apiClient.delete(`/extractors/${id}`);
  },

  testExtractor: async (id: string) => {
    const response = await apiClient.post<TestExtractorResponse>(`/extractors/${id}/test`);
    return response.data;
  },

  getCostSummary: async (id: string) => {
    const response = await apiClient.get<ExtractorCostSummary>(`/extractors/${id}/cost-summary`);
    return response.data;
  },

  getCostSummaries: async (ids: string[]) => {
    const response = await apiClient.get<ExtractorCostSummary[]>('/extractors/cost-summaries', {
      params: { ids: ids.join(',') },
    });
    return response.data;
  },
};
