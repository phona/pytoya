import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import { useExtractBulk, useOcrResult, useTriggerExtraction, useReExtractFieldPreview } from './use-manifests';

// Mock WebSocket
vi.mock('./use-websocket', () => ({
  useWebSocket: () => ({
    isConnected: false,
    isConnecting: false,
    subscribeToManifest: vi.fn(),
    unsubscribeFromManifest: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

describe('use-manifests - OCR and Extraction Integration', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('useOcrResult', () => {
    it('fetches OCR result for a manifest', async () => {
      const mockOcrResult = {
        manifestId: 1,
        ocrResult: {
          document: { type: 'invoice', language: ['zh'], pages: 2 },
          pages: [
            {
              pageNumber: 1,
              text: 'Invoice #001',
              markdown: '# Invoice',
              confidence: 0.92,
              layout: { elements: [], tables: [] },
            },
          ],
          metadata: { processedAt: '2024-01-15T10:30:00Z', modelVersion: 'PaddleOCR-VL', processingTimeMs: 1500 },
        },
        hasOcr: true,
        ocrProcessedAt: '2024-01-15T10:30:00Z',
        qualityScore: 90,
      };

      server.use(
        http.get('/api/manifests/1/ocr', () => HttpResponse.json(mockOcrResult)),
      );

      const { result } = renderHook(() => useOcrResult(1), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockOcrResult);
        expect(result.current.data?.qualityScore).toBe(90);
      });
    });

    it('returns 404 when OCR result does not exist', async () => {
      server.use(
        http.get('/api/manifests/1/ocr', () => new HttpResponse(null, { status: 404 })),
      );

      const { result } = renderHook(() => useOcrResult(1), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('useTriggerExtraction', () => {
    it('extracts manifest and returns job ID', async () => {
      const mockResponse = {
        jobId: 'job-123',
      };

      server.use(
        http.post('/api/manifests/1/extract', () => HttpResponse.json(mockResponse)),
      );

      const { result } = renderHook(() => useTriggerExtraction(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        const response = await result.current.mutateAsync({
          manifestId: 1,
          llmModelId: 'gpt-4o',
        });
        expect(response.jobId).toBe('job-123');
      });
    });
  });

  describe('useExtractBulk', () => {
    it('extracts multiple manifests and returns job IDs', async () => {
      const mockResponse = {
        jobIds: ['job-1', 'job-2', 'job-3'],
        manifestCount: 3,
      };

      server.use(
        http.post('/api/manifests/extract-bulk', () => HttpResponse.json(mockResponse)),
      );

      const { result } = renderHook(() => useExtractBulk(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        const response = await result.current.mutateAsync({
          manifestIds: [1, 2, 3],
          llmModelId: 'gpt-4o',
        });
        expect(response.jobIds).toHaveLength(3);
        expect(response.manifestCount).toBe(3);
      });
    });
  });

  describe('useReExtractFieldPreview', () => {
    it('queues field re-extraction', async () => {
      const mockResponse = {
        jobId: 'job-field-456',
        fieldName: 'invoice.po_no',
        ocrPreview: {
          fieldName: 'invoice.po_no',
          snippet: 'Invoice #001\nPO: 1234567',
          pageNumber: 1,
          confidence: 0.92,
        },
      };

      server.use(
        http.post('/api/manifests/1/re-extract-field', () => HttpResponse.json(mockResponse)),
      );

      const { result } = renderHook(() => useReExtractFieldPreview(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        const response = await result.current.mutateAsync({
          manifestId: 1,
          data: {
            fieldName: 'invoice.po_no',
            llmModelId: 'gpt-4o',
            previewOnly: false,
          },
        });
        expect(response.jobId).toBe('job-field-456');
      });
    });

    it('returns preview without job when previewOnly is true', async () => {
      const mockResponse = {
        fieldName: 'invoice.po_no',
        ocrPreview: {
          fieldName: 'invoice.po_no',
          snippet: 'Invoice #001\nPO: 1234567',
        },
      };

      server.use(
        http.post('/api/manifests/1/re-extract-field', () => HttpResponse.json(mockResponse)),
      );

      const { result } = renderHook(() => useReExtractFieldPreview(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        const response = await result.current.mutateAsync({
          manifestId: 1,
          data: {
            fieldName: 'invoice.po_no',
            previewOnly: true,
          },
        });
        expect(response.jobId).toBeUndefined();
        expect(response.ocrPreview).toBeDefined();
      });
    });
  });
});
