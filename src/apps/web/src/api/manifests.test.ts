import { http, HttpResponse } from 'msw';
import { manifestsApi } from './manifests';
import { server } from '@/tests/mocks/server';
import { vi } from 'vitest';
import apiClient from '@/api/client';

type ExtractionRequest = {
  llmModelId?: string;
  promptId?: number;
};

describe('manifestsApi', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('triggers extraction with configured model', async () => {
    let received: ExtractionRequest = {};

    server.use(
      http.post('/api/manifests/1/extract', async ({ request }) => {
        received = (await request.json()) as ExtractionRequest;
        return HttpResponse.json({ jobId: 'job-1' });
      }),
    );

    const result = await manifestsApi.triggerExtraction(1, 'llm-1', 2);
    expect(received).toEqual({ llmModelId: 'llm-1', promptId: 2 });
    expect(result.jobId).toBe('job-1');
  });

  it('lists manifests with filters, sorting, paging, and dynamic filters', async () => {
    let receivedUrl: URL | null = null;

    server.use(
      http.get('/api/groups/1/manifests', ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [],
          meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
        });
      }),
    );

    await manifestsApi.listManifests(1, {
      filters: {
        status: 'pending' as any,
        humanVerified: true,
        confidenceMin: 0.1,
        confidenceMax: 0.9,
        ocrQualityMin: 0.2,
        ocrQualityMax: 0.8,
        extractionStatus: 'done' as any,
        costMin: 1,
        costMax: 2,
        textExtractorId: 'extractor-1',
        extractorType: 'paddleocr' as any,
        dynamicFilters: [
          { field: 'document.field', value: 'x' },
          { field: '', value: '' },
        ],
      },
      sort: { field: 'createdAt', order: 'desc' },
      page: 2,
      pageSize: 25,
    } as any);

    expect(receivedUrl).not.toBeNull();
    const params = receivedUrl!.searchParams;
    expect(params.get('status')).toBe('pending');
    expect(params.get('humanVerified')).toBe('true');
    expect(params.get('confidenceMin')).toBe('0.1');
    expect(params.get('confidenceMax')).toBe('0.9');
    expect(params.get('ocrQualityMin')).toBe('0.2');
    expect(params.get('ocrQualityMax')).toBe('0.8');
    expect(params.get('extractionStatus')).toBe('done');
    expect(params.get('costMin')).toBe('1');
    expect(params.get('costMax')).toBe('2');
    expect(params.get('textExtractorId')).toBe('extractor-1');
    expect(params.get('extractorType')).toBe('paddleocr');
    expect(params.get('filter[document.field]')).toBe('x');
    expect(params.get('sortBy')).toBe('createdAt');
    expect(params.get('order')).toBe('desc');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('25');
  });

  it('lists manifests and returns the list response envelope', async () => {
    server.use(
      http.get('/api/groups/1/manifests', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              groupId: 1,
              filename: 'document.pdf',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          meta: { total: 1, page: 1, pageSize: 1, totalPages: 1 },
        }),
      ),
    );

    const result = await manifestsApi.listManifests(1);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('builds pdf URLs from api client baseURL', () => {
    const originalBaseUrl = apiClient.defaults.baseURL;
    apiClient.defaults.baseURL = 'http://example.test/api';

    try {
      expect(manifestsApi.getPdfUrl(12)).toBe('http://example.test/api/manifests/12/pdf');
    } finally {
      apiClient.defaults.baseURL = originalBaseUrl;
    }
  });

  it('exports selected manifests as Excel (.xlsx)', async () => {
    let exportBody: unknown = null;

    server.use(
      http.post('/api/manifests/export/xlsx', async ({ request }) => {
        exportBody = await request.json();
        return HttpResponse.arrayBuffer(new TextEncoder().encode('xlsx').buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        });
      }),
    );

    const blob = await manifestsApi.exportSelectedToXlsx([1, 2, 3]);
    expect(blob).toBeInstanceOf(Blob);
    expect(exportBody).toEqual({ manifestIds: [1, 2, 3] });
  });

  it('limits concurrent uploads during batch upload', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let created = 0;

    const files = Array.from({ length: 10 }).map(
      (_, index) =>
        new File([`pdf-${index}`], `invoice-${index}.pdf`, {
          type: 'application/pdf',
        }),
    );

    const uploadSpy = vi
      .spyOn(manifestsApi, 'uploadManifest')
      .mockImplementation(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);

        await new Promise((resolve) => setTimeout(resolve, 25));

        inFlight -= 1;
        created += 1;
        return { id: created, isDuplicate: false } as any;
      });

    const results = await manifestsApi.uploadManifestsBatch(
      1,
      files,
      undefined,
      { concurrency: 2 },
    );

    uploadSpy.mockRestore();

    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(results).toHaveLength(10);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
  });
});




