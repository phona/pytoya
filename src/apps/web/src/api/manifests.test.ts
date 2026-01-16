import { http, HttpResponse } from 'msw';
import { manifestsApi } from './manifests';
import { server } from '@/tests/mocks/server';

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
});
