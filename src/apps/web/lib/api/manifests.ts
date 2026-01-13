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
};
