import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import { useExtractBulk, useOcrResult, useTriggerOcr, useCostEstimate, useTriggerExtraction, useReExtractFieldPreview } from './use-manifests';

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

describe('use-manifests - Cost and OCR Integration', () => {
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

  describe('useTriggerOcr', () => {
    it('triggers OCR processing for a manifest', async () => {
      const mockOcrResult = {
        manifestId: 1,
        ocrResult: {
          document: { type: 'invoice', language: ['zh'], pages: 1 },
          pages: [
            {
              pageNumber: 1,
              text: 'Processed text',
              markdown: '# Processed',
              confidence: 0.88,
              layout: { elements: [], tables: [] },
            },
          ],
          metadata: { processedAt: '2024-01-15T11:00:00Z', modelVersion: 'PaddleOCR-VL', processingTimeMs: 1200 },
        },
        hasOcr: true,
        ocrProcessedAt: '2024-01-15T11:00:00Z',
        qualityScore: 88,
      };

      server.use(
        http.post('/api/manifests/1/ocr', () => HttpResponse.json(mockOcrResult)),
      );

      const { result } = renderHook(() => useTriggerOcr(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        const response = await result.current.mutateAsync({ manifestId: 1 });
        expect(response.ocrResult).toBeDefined();
        expect(response.qualityScore).toBe(88);
      });
    });

    it('triggers OCR with force parameter', async () => {
      server.use(
        http.post('/api/manifests/1/ocr', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('force')).toBe('true');
          return HttpResponse.json({ ocrResult: {} });
        }),
      );

      const { result } = renderHook(() => useTriggerOcr(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        await result.current.mutateAsync({ manifestId: 1, force: true });
      });
    });
  });

  describe('useCostEstimate', () => {
    it('calculates cost estimate for manifests', async () => {
      const mockEstimate = {
        manifestCount: 3,
        estimatedTokensMin: 3000,
        estimatedTokensMax: 4500,
        estimatedCostMin: 0.03,
        estimatedCostMax: 0.045,
        estimatedTextCost: 0.009,
        estimatedLlmCostMin: 0.021,
        estimatedLlmCostMax: 0.036,
        currency: 'USD',
      };

      server.use(
        http.get('/api/manifests/cost-estimate', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('manifestIds')).toBe('1,2,3');
          expect(url.searchParams.get('llmModelId')).toBe('gpt-4o');
          expect(url.searchParams.get('textExtractorId')).toBe('extractor-1');
          return HttpResponse.json(mockEstimate);
        }),
      );

      const { result } = renderHook(() => useCostEstimate(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        const response = await result.current.mutateAsync({
          manifestIds: [1, 2, 3],
          llmModelId: 'gpt-4o',
          textExtractorId: 'extractor-1',
        });
        expect(response).toEqual(mockEstimate);
        expect(response.manifestCount).toBe(3);
        expect(response.estimatedTextCost).toBe(0.009);
      });
    });

    it('separates text and LLM costs', async () => {
      const mockEstimate = {
        manifestCount: 1,
        estimatedTokensMin: 1000,
        estimatedTokensMax: 1500,
        estimatedCostMin: 0.02,
        estimatedCostMax: 0.03,
        estimatedTextCost: 0.003, // text cost
        estimatedLlmCostMin: 0.017, // LLM cost min
        estimatedLlmCostMax: 0.027, // LLM cost max
        currency: 'USD',
      };

      server.use(
        http.get('/api/manifests/cost-estimate', () => HttpResponse.json(mockEstimate)),
      );

      const { result } = renderHook(() => useCostEstimate(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      await act(async () => {
        const data = await result.current.mutateAsync({
          manifestIds: [1],
          llmModelId: 'llm-model-1',
          textExtractorId: 'extractor-1',
        });
        expect(data.estimatedTextCost).toBe(0.003);
        expect(data.estimatedLlmCostMin).toBe(0.017);
        expect(data.estimatedLlmCostMax).toBe(0.027);
        expect(data.estimatedCostMin).toBeCloseTo(0.02, 2);
      });
    });
  });

  describe('useTriggerExtraction', () => {
    it('extracts manifest and returns job ID with cost', async () => {
      const mockResponse = {
        jobId: 'job-123',
        estimatedCost: {
          min: 0.015,
          max: 0.025,
        },
        currency: 'USD',
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
        expect(response.estimatedCost).toBeDefined();
        expect(response.estimatedCost?.min).toBe(0.015);
      });
    });
  });

  describe('useExtractBulk', () => {
    it('extracts multiple manifests and returns job IDs with total cost', async () => {
      const mockResponse = {
        jobIds: ['job-1', 'job-2', 'job-3'],
        manifestCount: 3,
        estimatedCost: {
          min: 0.045,
          max: 0.075,
        },
        currency: 'USD',
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
        expect(response.estimatedCost.min).toBe(0.045);
      });
    });
  });

  describe('useReExtractFieldPreview', () => {
    it('queues field re-extraction with cost estimate', async () => {
      const mockResponse = {
        jobId: 'job-field-456',
        fieldName: 'invoice.po_no',
        ocrPreview: {
          fieldName: 'invoice.po_no',
          snippet: 'Invoice #001\nPO: 1234567',
          pageNumber: 1,
          confidence: 0.92,
        },
        estimatedCost: 0.005,
        currency: 'USD',
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
        expect(response.estimatedCost).toBe(0.005);
        expect(response.currency).toBe('USD');
      });
    });

    it('returns preview without job when previewOnly is true', async () => {
      const mockResponse = {
        fieldName: 'invoice.po_no',
        ocrPreview: {
          fieldName: 'invoice.po_no',
          snippet: 'Invoice #001\nPO: 1234567',
        },
        estimatedCost: 0.003,
        currency: 'USD',
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
        expect(response.estimatedCost).toBeDefined();
      });
    });
  });
});
