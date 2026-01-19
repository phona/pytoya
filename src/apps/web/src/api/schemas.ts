import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';
import type {
  CreateSchemaDto,
  CreateSchemaRuleDto,
  GenerateRulesDto,
  GenerateSchemaDto,
  ImportSchemaDto,
  SchemaResponseDto,
  SchemaRuleResponseDto,
  UpdateSchemaDto,
  UpdateSchemaRuleDto,
  ValidateSchemaDto,
} from '@pytoya/shared/types/schemas';
import { SchemaRuleOperator, SchemaRuleType } from '@pytoya/shared/types/schemas';
import { ExtractionStrategy } from '@pytoya/shared/types/extraction';

export type Schema = Jsonify<SchemaResponseDto>;
export type SchemaRule = Jsonify<SchemaRuleResponseDto>;
export type GeneratedSchemaRule = Omit<
  SchemaRule,
  'id' | 'schemaId' | 'createdAt'
>;
export type {
  CreateSchemaDto,
  CreateSchemaRuleDto,
  GenerateRulesDto,
  GenerateSchemaDto,
  ImportSchemaDto,
  UpdateSchemaDto,
  UpdateSchemaRuleDto,
  ValidateSchemaDto,
};
export { ExtractionStrategy, SchemaRuleOperator, SchemaRuleType };

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface SchemaValidationError {
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors?: SchemaValidationError[];
}

export interface ImportSchemaResult {
  valid: boolean;
  jsonSchema?: Record<string, unknown>;
  errors?: SchemaValidationError[];
}

export const schemasApi = {
  // Schemas
  listSchemas: async () => {
    const response = await apiClient.get<Schema[]>('/schemas');
    return response.data;
  },

  getSchema: async (id: number) => {
    const response = await apiClient.get<Schema>(`/schemas/${id}`);
    return response.data;
  },

  getProjectSchemas: async (projectId: number) => {
    const response = await apiClient.get<Schema[]>(`/schemas/project/${projectId}`);
    return response.data;
  },

  createSchema: async (data: CreateSchemaDto) => {
    const response = await apiClient.post<Schema>('/schemas', data);
    return response.data;
  },

  updateSchema: async (id: number, data: UpdateSchemaDto) => {
    const response = await apiClient.patch<Schema>(`/schemas/${id}`, data);
    return response.data;
  },

  deleteSchema: async (id: number) => {
    await apiClient.delete(`/schemas/${id}`);
  },

  // Schema rules
  listSchemaRules: async (schemaId: number) => {
    const response = await apiClient.get<SchemaRule[]>(`/schemas/${schemaId}/rules`);
    return response.data;
  },

  createSchemaRule: async (schemaId: number, data: CreateSchemaRuleDto) => {
    const response = await apiClient.post<SchemaRule>(`/schemas/${schemaId}/rules`, data);
    return response.data;
  },

  updateSchemaRule: async (schemaId: number, ruleId: number, data: UpdateSchemaRuleDto) => {
    const response = await apiClient.patch<SchemaRule>(`/schemas/${schemaId}/rules/${ruleId}`, data);
    return response.data;
  },

  deleteSchemaRule: async (schemaId: number, ruleId: number) => {
    const response = await apiClient.delete<SchemaRule>(`/schemas/${schemaId}/rules/${ruleId}`);
    return response.data;
  },

  // AI generation
  generateSchema: async (data: GenerateSchemaDto) => {
    const response = await apiClient.post<{ jsonSchema: Record<string, unknown> }>('/schemas/generate', data);
    return response.data;
  },

  generateRules: async (schemaId: number, data: GenerateRulesDto) => {
    const response = await apiClient.post<{ rules: GeneratedSchemaRule[] }>(`/schemas/${schemaId}/generate-rules`, data);
    return response.data;
  },

  generateRulesFromSchema: async (data: GenerateRulesDto) => {
    const response = await apiClient.post<{ rules: GeneratedSchemaRule[] }>('/schemas/generate-rules', data);
    return response.data;
  },

  // Validation
  validateSchemaDefinition: async (data: ValidateSchemaDto) => {
    const response = await apiClient.post<SchemaValidationResult>('/schemas/validate', data);
    return response.data;
  },

  validateWithRequired: async (data: ValidateSchemaDto) => {
    const response = await apiClient.post<ValidationResult>('/schemas/validate-with-required', data);
    return response.data;
  },

  // Import
  importSchema: async (data: ImportSchemaDto) => {
    const formData = new FormData();
    if (data.file instanceof Blob) {
      formData.append('file', data.file);
    }
    const response = await apiClient.post<ImportSchemaResult>('/schemas/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};




