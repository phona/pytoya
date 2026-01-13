import apiClient from '@/lib/api-client';

export interface Manifest {
  id: number;
  filename: string;
  originalFilename: string;
  storagePath: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  groupId: number;
  extractedData: Record<string, unknown> | null;
  confidence: number | null;
  purchaseOrder: string | null;
  invoiceDate: string | null;
  department: string | null;
  humanVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManifestItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  manifestId: number;
}

export interface UploadManifestDto {
  groupId: number;
  file: File;
}

export interface UpdateManifestDto {
  extractedData?: Record<string, unknown>;
  confidence?: number;
  purchaseOrder?: string;
  invoiceDate?: string;
  department?: string;
  humanVerified?: boolean;
}

export const manifestsApi = {
  // List manifests for a group
  listManifests: async (groupId: number) => {
    const response = await apiClient.get<Manifest[]>(`/groups/${groupId}/manifests`);
    return response.data;
  },

  // Get single manifest
  getManifest: async (manifestId: number) => {
    const response = await apiClient.get<Manifest>(`/manifests/${manifestId}`);
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

  // Trigger extraction
  triggerExtraction: async (manifestId: number, providerId?: number, promptId?: number) => {
    const response = await apiClient.post<{ jobId: string }>(`/manifests/${manifestId}/extract`, {
      providerId,
      promptId,
    });
    return response.data;
  },

  // Re-extract specific field
  reExtractField: async (manifestId: number, fieldName: string) => {
    const response = await apiClient.post<{ jobId: string }>(`/manifests/${manifestId}/re-extract`, {
      fieldName,
    });
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
