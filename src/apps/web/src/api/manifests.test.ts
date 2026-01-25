import { http, HttpResponse } from 'msw';
import { manifestsApi } from './manifests';
import { server } from '@/tests/mocks/server';
import { vi } from 'vitest';

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




