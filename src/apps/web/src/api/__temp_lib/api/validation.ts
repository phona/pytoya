import apiClient from '@/lib/api-client';

export type ValidationSeverity = 'warning' | 'error';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
  actual?: unknown;
  expected?: unknown;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  validatedAt: string;
}

export interface ValidationScript {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  script: string;
  severity: ValidationSeverity;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateValidationScriptDto {
  name: string;
  description?: string;
  projectId: number;
  script: string;
  severity?: ValidationSeverity;
  enabled?: boolean;
}

export interface UpdateValidationScriptDto {
  name?: string;
  description?: string;
  script?: string;
  severity?: ValidationSeverity;
  enabled?: boolean;
}

export interface ValidateScriptSyntaxDto {
  script: string;
}

export interface ValidateScriptSyntaxResult {
  valid: boolean;
  error?: string;
}

export interface GenerateValidationScriptDto {
  providerId: number;
  prompt: string;
  structured: Record<string, unknown>;
}

export interface GeneratedValidationScript {
  name: string;
  description: string;
  severity: ValidationSeverity;
  script: string;
}

export interface RunValidationDto {
  manifestId: number;
  scriptIds?: number[];
}

export interface BatchValidationDto {
  manifestIds: number[];
  scriptIds?: number[];
}

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
