import apiClient from '@/api/client';
import type {
  CreateExportScriptDto,
  ExportScriptConsoleEntry,
  ExportScriptConsoleLevel,
  ExportScriptFormat,
  ExportScriptResponseDto,
  TestExportScriptDto,
  TestExportScriptResponseDto,
  UpdateExportScriptDto,
  ValidateExportScriptSyntaxDto,
} from '@pytoya/shared/types/export-scripts';
import type { Jsonify } from '@/api/types';

export type ExportScript = Jsonify<ExportScriptResponseDto>;
export type { ExportScriptFormat };
export type {
  CreateExportScriptDto,
  UpdateExportScriptDto,
  ValidateExportScriptSyntaxDto,
  TestExportScriptDto,
  TestExportScriptResponseDto,
  ExportScriptConsoleEntry,
  ExportScriptConsoleLevel,
};

export interface ValidateExportScriptSyntaxResult {
  valid: boolean;
  error?: string;
}

export const exportScriptsApi = {
  listScripts: async () => {
    const response = await apiClient.get<ExportScript[]>('/export-scripts');
    return response.data;
  },

  getScript: async (id: number) => {
    const response = await apiClient.get<ExportScript>(`/export-scripts/${id}`);
    return response.data;
  },

  getProjectScripts: async (projectId: number) => {
    const response = await apiClient.get<ExportScript[]>(`/export-scripts/project/${projectId}`);
    return response.data;
  },

  createScript: async (data: CreateExportScriptDto) => {
    const response = await apiClient.post<ExportScript>('/export-scripts', data);
    return response.data;
  },

  updateScript: async (id: number, data: UpdateExportScriptDto) => {
    const response = await apiClient.post<ExportScript>(`/export-scripts/${id}`, data);
    return response.data;
  },

  deleteScript: async (id: number) => {
    await apiClient.delete(`/export-scripts/${id}`);
  },

  validateScriptSyntax: async (data: ValidateExportScriptSyntaxDto) => {
    const response = await apiClient.post<ValidateExportScriptSyntaxResult>('/export-scripts/validate-syntax', data);
    return response.data;
  },

  testScript: async (data: TestExportScriptDto) => {
    const response = await apiClient.post<TestExportScriptResponseDto>('/export-scripts/test', data);
    return response.data;
  },
};

