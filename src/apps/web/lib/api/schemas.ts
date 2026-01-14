import apiClient from '@/lib/api-client';

export interface Schema {
  id: number;
  name: string;
  jsonSchema: Record<string, unknown>;
  requiredFields: string[];
  projectId: number;
  isTemplate: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchemaDto {
  name: string;
  jsonSchema: Record<string, unknown>;
  requiredFields: string[];
  projectId: number;
  description?: string;
  isTemplate?: boolean;
}

export interface UpdateSchemaDto {
  name?: string;
  jsonSchema?: Record<string, unknown>;
  requiredFields?: string[];
  description?: string;
  isTemplate?: boolean;
}

export interface ValidateSchemaDto {
  jsonSchema: Record<string, unknown>;
  data: Record<string, unknown>;
  requiredFields?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
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

  getTemplates: async () => {
    const response = await apiClient.get<Schema[]>('/schemas/templates');
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

  // Validation
  validateSchema: async (data: ValidateSchemaDto) => {
    const response = await apiClient.post<ValidationResult>('/schemas/validate', data);
    return response.data;
  },

  validateWithRequired: async (data: ValidateSchemaDto) => {
    const response = await apiClient.post<ValidationResult>('/schemas/validate-with-required', data);
    return response.data;
  },
};
