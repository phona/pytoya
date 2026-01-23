import apiClient from '@/api/client';
import type { Jsonify } from '@/api/types';
import { ManifestListQueryParams } from '@/shared/types/manifests';
import type {
  ManifestListResponseDto,
  ManifestResponseDto,
  UpdateManifestDto,
  OcrResultResponseDto,
  ManifestExtractionHistoryEntryDto,
  ManifestExtractionHistoryEntryDetailsDto,
  BulkExtractDto,
  ExtractFilteredDto,
  ExtractFilteredResponseDto,
  ReExtractFieldPreviewDto,
  ReExtractFieldPreviewResponseDto,
} from '@pytoya/shared/types/manifests';

export type Manifest = Jsonify<ManifestResponseDto>;
export type ManifestListResponse = Jsonify<ManifestListResponseDto>;
export type { UpdateManifestDto };
export type OcrResultResponse = Jsonify<OcrResultResponseDto>;
export type ManifestExtractionHistoryEntry = Jsonify<ManifestExtractionHistoryEntryDto>;
export type ManifestExtractionHistoryEntryDetails = Jsonify<ManifestExtractionHistoryEntryDetailsDto>;
export type ReExtractFieldPreviewResponse = Jsonify<ReExtractFieldPreviewResponseDto>;
export type ExtractFilteredResponse = Jsonify<ExtractFilteredResponseDto>;

export interface ManifestItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  manifestId: number;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'warning' | 'error';
  actual?: unknown;
  expected?: unknown;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  validatedAt: string;
}

export interface UploadManifestDto {
  groupId: number;
  file: File;
}

export const manifestsApi = {
  // List manifests for a group
  listManifests: async (groupId: number, params?: ManifestListQueryParams) => {
    const searchParams = new URLSearchParams();
    const filters = params?.filters;

    if (filters?.status) searchParams.append('status', filters.status);
    if (filters?.poNo) searchParams.append('poNo', filters.poNo);
    if (filters?.department) searchParams.append('department', filters.department);
    if (filters?.dateFrom) searchParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) searchParams.append('dateTo', filters.dateTo);
    if (filters?.humanVerified !== undefined) {
      searchParams.append('humanVerified', String(filters.humanVerified));
    }
    if (filters?.confidenceMin !== undefined) {
      searchParams.append('confidenceMin', String(filters.confidenceMin));
    }
    if (filters?.confidenceMax !== undefined) {
      searchParams.append('confidenceMax', String(filters.confidenceMax));
    }
    if (filters?.ocrQualityMin !== undefined) {
      searchParams.append('ocrQualityMin', String(filters.ocrQualityMin));
    }
    if (filters?.ocrQualityMax !== undefined) {
      searchParams.append('ocrQualityMax', String(filters.ocrQualityMax));
    }
    if (filters?.extractionStatus) {
      searchParams.append('extractionStatus', filters.extractionStatus);
    }
    if (filters?.costMin !== undefined) {
      searchParams.append('costMin', String(filters.costMin));
    }
    if (filters?.costMax !== undefined) {
      searchParams.append('costMax', String(filters.costMax));
    }
    if (filters?.textExtractorId) {
      searchParams.append('textExtractorId', filters.textExtractorId);
    }
    if (filters?.extractorType) {
      searchParams.append('extractorType', filters.extractorType);
    }
    if (filters?.dynamicFilters) {
      filters.dynamicFilters.forEach(({ field, value }) => {
        if (field && value) {
          searchParams.append(`filter[${field}]`, value);
        }
      });
    }

    if (params?.sort?.field) searchParams.append('sortBy', params.sort.field);
    if (params?.sort?.order) searchParams.append('order', params.sort.order);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.pageSize) searchParams.append('pageSize', String(params.pageSize));

    const response = await apiClient.get<ManifestListResponse | Manifest[]>(
      `/groups/${groupId}/manifests`,
      { params: searchParams },
    );

    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        meta: {
          total: response.data.length,
          page: 1,
          pageSize: response.data.length,
          totalPages: response.data.length > 0 ? 1 : 0,
        },
      };
    }

    return response.data;
  },

  // Get single manifest
  getManifest: async (manifestId: number) => {
    const response = await apiClient.get<Manifest>(`/manifests/${manifestId}`);
    return response.data;
  },

  getExtractionHistory: async (manifestId: number, params?: { limit?: number }) => {
    const response = await apiClient.get<ManifestExtractionHistoryEntry[]>(
      `/manifests/${manifestId}/extraction-history`,
      { params },
    );
    return response.data;
  },

  getExtractionHistoryEntry: async (manifestId: number, jobId: number) => {
    const response = await apiClient.get<ManifestExtractionHistoryEntryDetails>(
      `/manifests/${manifestId}/extraction-history/${jobId}`,
    );
    return response.data;
  },

  // Upload single file
  uploadManifest: async (groupId: number, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<Manifest>(`/groups/${groupId}/manifests`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Batch upload
  uploadManifestsBatch: async (
    groupId: number,
    files: File[],
    onProgress?: (fileIndex: number, fileName: string, progress: number) => void,
  ) => {
    const results = await Promise.allSettled(
      files.map((file, index) =>
        manifestsApi.uploadManifest(groupId, file, (progress) => {
          onProgress?.(index, file.name, progress);
        }),
      ),
    );
    return results;
  },

  // Update manifest
  updateManifest: async (manifestId: number, data: UpdateManifestDto) => {
    const response = await apiClient.patch<Manifest>(`/manifests/${manifestId}`, data);
    return response.data;
  },

  // Delete manifest
  deleteManifest: async (manifestId: number) => {
    await apiClient.delete(`/manifests/${manifestId}`);
  },

  // Get manifest items
  getManifestItems: async (manifestId: number) => {
    const response = await apiClient.get<ManifestItem[]>(`/manifests/${manifestId}/items`);
    return response.data;
  },

  // Get PDF file URL
  getPdfUrl: (manifestId: number) => {
    return `${apiClient.defaults.baseURL}/manifests/${manifestId}/pdf`;
  },

  getPdfFileBlob: async (manifestId: number) => {
    const response = await apiClient.get<Blob>(`/manifests/${manifestId}/pdf-file`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Trigger extraction
  triggerExtraction: async (manifestId: number, llmModelId?: string, promptId?: number) => {
    const response = await apiClient.post<{ jobId: string }>(`/manifests/${manifestId}/extract`, {
      llmModelId,
      promptId,
    });
    return response.data;
  },

  getOcrResult: async (manifestId: number) => {
    const response = await apiClient.get<OcrResultResponse>(`/manifests/${manifestId}/ocr`);
    return response.data;
  },

  extractManifest: async (manifestId: number, data?: { llmModelId?: string; promptId?: number }) => {
    const response = await apiClient.post<{
      jobId: string;
    }>(`/manifests/${manifestId}/extract`, data ?? {});
    return response.data;
  },

  extractBulk: async (data: BulkExtractDto) => {
    const response = await apiClient.post<{
      jobId: string;
      jobIds?: string[];
      jobs?: Array<{ jobId: string; manifestId: number }>;
      manifestCount: number;
    }>('/manifests/extract-bulk', data);
    return response.data;
  },

  extractFiltered: async (groupId: number, data: ExtractFilteredDto) => {
    const response = await apiClient.post<ExtractFilteredResponse>(
      `/groups/${groupId}/manifests/extract-filtered`,
      data,
    );
    return response.data;
  },

  // Re-extract specific field
  reExtractField: async (manifestId: number, fieldName: string, llmModelId?: string, promptId?: number) => {
    const response = await apiClient.post<{ jobId: string }>(`/manifests/${manifestId}/re-extract`, {
      fieldName,
      llmModelId,
      promptId,
    });
    return response.data;
  },

  reExtractFieldWithPreview: async (manifestId: number, data: ReExtractFieldPreviewDto) => {
    const response = await apiClient.post<ReExtractFieldPreviewResponse>(`/manifests/${manifestId}/re-extract-field`, data);
    return response.data;
  },

  // Export manifests to CSV
  exportToCsv: async (filters?: {
    status?: string;
    groupId?: number;
    projectId?: number;
    poNo?: string;
    department?: string;
    dateFrom?: string;
    dateTo?: string;
    humanVerified?: boolean;
    confidenceMin?: number;
    confidenceMax?: number;
    ocrQualityMin?: number;
    ocrQualityMax?: number;
    extractionStatus?: string;
    costMin?: number;
    costMax?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.groupId) params.append('groupId', filters.groupId.toString());
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());
    if (filters?.poNo) params.append('poNo', filters.poNo);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.humanVerified !== undefined) params.append('humanVerified', filters.humanVerified.toString());
    if (filters?.confidenceMin !== undefined) params.append('confidenceMin', filters.confidenceMin.toString());
    if (filters?.confidenceMax !== undefined) params.append('confidenceMax', filters.confidenceMax.toString());
    if (filters?.ocrQualityMin !== undefined) params.append('ocrQualityMin', filters.ocrQualityMin.toString());
    if (filters?.ocrQualityMax !== undefined) params.append('ocrQualityMax', filters.ocrQualityMax.toString());
    if (filters?.extractionStatus) params.append('extractionStatus', filters.extractionStatus);
    if (filters?.costMin !== undefined) params.append('costMin', filters.costMin.toString());
    if (filters?.costMax !== undefined) params.append('costMax', filters.costMax.toString());

    const response = await apiClient.get<Blob>('/manifests/export/csv', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Export specific manifests to CSV
  exportSelectedToCsv: async (manifestIds: number[]) => {
    const response = await apiClient.post<Blob>('/manifests/export/csv', {
      manifestIds,
    }, {
      responseType: 'blob',
    });
    return response.data;
  },
};




