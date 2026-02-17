import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import { useExtractBulk, useOcrResult, useTriggerExtraction, useReExtractField } from './use-manifests';

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

      server.use(http.get('/api/manifests/1/ocr', () => HttpResponse.json(mockOcrResult)));

      const { result } = renderHook(() => useOcrResult(1), {
        wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockOcrResult);
        expect(result.current.data?.qualityScore).toBe(90);
      });
    });

    it('returns 404 when OCR result does not exist', async () => {
      server.use(http.get('/api/manifests/1/ocr', () => new HttpResponse(null, { status: 404 })));

      const { result } = renderHook(() => useOcrResult(1), {
        wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
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

      server.use(http.post('/api/manifests/1/extract', () => HttpResponse.json(mockResponse)));

      const { result } = renderHook(() => useTriggerExtraction(), {
        wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
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

      server.use(http.post('/api/manifests/extract-bulk', () => HttpResponse.json(mockResponse)));

      const { result } = renderHook(() => useExtractBulk(), {
        wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
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

  describe('useReExtractField', () => {
    it('queues field re-extraction', async () => {
      const mockResponse = {
        jobId: 'job-field-456',
      };

      server.use(http.post('/api/manifests/1/re-extract', () => HttpResponse.json(mockResponse)));

      const { result } = renderHook(() => useReExtractField(), {
        wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
      });

      await act(async () => {
        const response = await result.current.mutateAsync({
          manifestId: 1,
          fieldName: 'invoice.po_no',
          llmModelId: 'gpt-4o',
        });
        expect(response.jobId).toBe('job-field-456');
      });
    });
  });
});