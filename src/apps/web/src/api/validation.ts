import apiClient from '@/api/client';
import type {
  BatchValidationDto,
  CreateValidationScriptDto,
  GenerateValidationScriptDto,
  GeneratedValidationScriptResponseDto,
  RunValidationDto,
  UpdateValidationScriptDto,
  ValidateScriptSyntaxDto,
  ValidationSeverity,
  ValidationScriptResponseDto,
} from '@pytoya/shared/types/validation';
import type { ValidationIssue, ValidationResult } from '@/api/manifests';
import type { Jsonify } from '@/api/types';

export type ValidationScript = Jsonify<ValidationScriptResponseDto>;
export type { ValidationIssue, ValidationResult };
export type { ValidationSeverity };
export type {
  CreateValidationScriptDto,
  UpdateValidationScriptDto,
  ValidateScriptSyntaxDto,
  GenerateValidationScriptDto,
  RunValidationDto,
  BatchValidationDto,
};

export interface ValidateScriptSyntaxResult {
  valid: boolean;
  error?: string;
}

export type GeneratedValidationScript = GeneratedValidationScriptResponseDto;

export const validationApi = {
  // Scripts CRUD
  listScripts: async () => {
    const response = await apiClient.get<ValidationScript[]>('/validation/scripts');
    return response.data;
  },

  getScript: async (id: number) => {
    const response = await apiClient.get<ValidationScript>(`/validation/scripts/${id}`);
    return response.data;
  },

  getProjectScripts: async (projectId: number) => {
    const response = await apiClient.get<ValidationScript[]>(`/validation/scripts/project/${projectId}`);
    return response.data;
  },

  createScript: async (data: CreateValidationScriptDto) => {
    const response = await apiClient.post<ValidationScript>('/validation/scripts', data);
    return response.data;
  },

  updateScript: async (id: number, data: UpdateValidationScriptDto) => {
    const response = await apiClient.post<ValidationScript>(`/validation/scripts/${id}`, data);
    return response.data;
  },

  deleteScript: async (id: number) => {
    await apiClient.delete(`/validation/scripts/${id}`);
  },

  // Script syntax validation
  validateScriptSyntax: async (data: ValidateScriptSyntaxDto) => {
    const response = await apiClient.post<ValidateScriptSyntaxResult>('/validation/scripts/validate-syntax', data);
    return response.data;
  },

  generateScript: async (data: GenerateValidationScriptDto) => {
    const response = await apiClient.post<GeneratedValidationScript>('/validation/scripts/generate', data);
    return response.data;
  },

  // Validation execution
  runValidation: async (data: RunValidationDto) => {
    const response = await apiClient.post<ValidationResult>('/validation/run', data);
    return response.data;
  },

  runBatchValidation: async (data: BatchValidationDto) => {
    const response = await apiClient.post<Record<number, ValidationResult>>('/validation/batch', data);
    return response.data;
  },
};
