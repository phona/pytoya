import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useManifests, useManifest, useManifestItems, useUpdateManifest, useDeleteManifest, useReExtractField, useTriggerExtraction, useRefreshOcrResult } from './use-manifests';
import { server } from '../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useManifests', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('useManifests', () => {
    it('should fetch manifests for a group', async () => {
      const { result } = renderHook(() => useManifests(1), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        data: [
          {
            id: 1,
            filename: 'manifest_0000001.pdf',
            originalFilename: 'test.pdf',
            storagePath: '/uploads/test.pdf',
            fileSize: 12345,
            fileType: 'pdf',
            status: 'completed',
            groupId: 1,
            extractedData: {
              invoice: {
                po_no: '0000001',
                invoice_date: '2025-01-13',
                department_code: 'PROD',
              },
            },
            confidence: 0.95,
            purchaseOrder: '0000001',
            invoiceDate: '2025-01-13',
            department: 'PROD',
            humanVerified: false,
            validationResults: null,
            ocrResult: null,
            ocrProcessedAt: null,
            ocrQualityScore: null,
            extractionCost: null,
            textExtractorId: 'extractor-1',
            createdAt: '2025-01-13T00:00:00.000Z',
            updatedAt: '2025-01-13T00:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
      });
    });

    it('should handle empty manifests list', async () => {
      server.use(
        http.get('/api/groups/:groupId/manifests', () => {
          return HttpResponse.json({
            data: [],
            meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 },
          });
        })
      );

      const { result } = renderHook(() => useManifests(1), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toEqual([]);
    });
  });

  describe('useManifest', () => {
    it('should fetch single manifest', async () => {
      const { result } = renderHook(() => useManifest(1), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual({
        id: 1,
        filename: 'manifest_0000001.pdf',
        originalFilename: 'test.pdf',
        storagePath: '/uploads/test.pdf',
        fileSize: 12345,
        fileType: 'pdf',
        status: 'completed',
        groupId: 1,
        extractedData: { field: 'value' },
        confidence: 0.95,
        purchaseOrder: '0000001',
        invoiceDate: '2025-01-13',
        department: 'PROD',
        humanVerified: false,
        validationResults: null,
        ocrResult: null,
        ocrProcessedAt: null,
        ocrQualityScore: null,
        extractionCost: null,
        textExtractorId: 'extractor-1',
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      });
    });
  });

  describe('useManifestItems', () => {
    it('should fetch manifest items', async () => {
      const { result } = renderHook(() => useManifestItems(1), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual([
        {
          id: 1,
          manifestId: 1,
          fieldName: 'field',
          fieldValue: 'value',
          confidence: 0.95,
        },
      ]);
    });
  });

  describe('useUpdateManifest', () => {
    it('should update manifest', async () => {
      const { result } = renderHook(() => useUpdateManifest(), { wrapper: createWrapper() });

      const updateData = { extractedData: { field: 'value' } };

      await result.current.mutateAsync({ manifestId: 1, data: updateData });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('useDeleteManifest', () => {
    it('should delete manifest', async () => {
      const { result } = renderHook(() => useDeleteManifest(), { wrapper: createWrapper() });

      await result.current.mutateAsync(1);

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('useReExtractField', () => {
    it('should trigger re-extraction', async () => {
      const { result } = renderHook(() => useReExtractField(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        manifestId: 1,
        fieldName: 'total',
        llmModelId: 'model-1',
        promptId: 1,
      });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('useTriggerExtraction', () => {
    it('should trigger extraction', async () => {
      const { result } = renderHook(() => useTriggerExtraction(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        manifestId: 1,
        llmModelId: 'model-1',
      });

      // If we get here without throwing, the mutation succeeded
      expect(true).toBe(true);
    });
  });

  describe('useRefreshOcrResult', () => {
    it('should refresh OCR result cache', async () => {
      server.use(
        http.post('/api/manifests/:manifestId/ocr/refresh', () => {
          return HttpResponse.json({
            manifestId: 1,
            ocrResult: null,
            hasOcr: false,
            ocrProcessedAt: null,
            qualityScore: null,
          });
        }),
      );

      const { result } = renderHook(() => useRefreshOcrResult(), { wrapper: createWrapper() });

      await result.current.mutateAsync({ manifestId: 1 });

      expect(true).toBe(true);
    });
  });
});
